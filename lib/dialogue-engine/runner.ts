"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  CastMember,
  Choice,
  Effect,
  Line,
  LineRequires,
  RunnerState,
  Scene,
  Node as SceneNode,
} from "./types";
import { rollCheck } from "@/lib/pc/skill-check";
import { type CheckResult } from "@/lib/pc/stats";
import { useSave } from "@/lib/game-state/store";

export type SceneEvent =
  | { kind: "check"; result: CheckResult; label: string }
  | { kind: "goto"; scene: string }
  | { kind: "chapterComplete"; chapter: string; nextChapter?: string }
  | { kind: "end"; outcome: string };

function matchesRequires(
  r: LineRequires | Choice["requires"] | undefined,
  flags: Record<string, boolean | string | number>,
  stats: Record<string, number>,
): boolean {
  if (!r) return true;
  if (r.flag && !flags[r.flag]) return false;
  if (r.flagEquals && flags[r.flagEquals.key] !== r.flagEquals.value)
    return false;
  if (
    "flagNotEquals" in r &&
    r.flagNotEquals &&
    flags[r.flagNotEquals.key] === r.flagNotEquals.value
  )
    return false;
  if (r.minStat && (stats[r.minStat.stat] ?? 0) < r.minStat.value) return false;
  if (r.maxStat && (stats[r.maxStat.stat] ?? 0) > r.maxStat.value) return false;
  return true;
}

function choiceAvailable(
  flags: Record<string, boolean | string | number>,
  stats: Record<string, number>,
  choice: Choice,
): boolean {
  return matchesRequires(choice.requires, flags, stats);
}

function firstVisibleIndex(
  node: SceneNode,
  from: number,
  flags: Record<string, boolean | string | number>,
  stats: Record<string, number>,
): number | null {
  for (let i = from; i < node.lines.length; i++) {
    if (matchesRequires(node.lines[i].requires, flags, stats)) return i;
  }
  return null;
}

type Args = {
  scene: Scene;
  onEvent: (event: SceneEvent) => void;
};

export function useSceneRunner({ scene, onEvent }: Args) {
  const [state, setState] = useState<RunnerState>({
    nodeId: scene.entry,
    lineIndex: 0,
  });
  const [busy, setBusy] = useState(false);
  const [lastCheck, setLastCheck] = useState<CheckResult | null>(null);
  const [improvError, setImprovError] = useState<string | null>(null);
  const appliedRef = useRef<Set<string>>(new Set());

  const pc = useSave((s) => s.pc);
  const applyStat = useSave((s) => s.applyStat);
  const setFlag = useSave((s) => s.setFlag);
  const addMemory = useSave((s) => s.addMemory);

  const node = scene.nodes[state.nodeId];
  if (!node) throw new Error(`Missing node ${state.nodeId} in ${scene.id}`);

  const cast: CastMember[] = node.cast ?? scene.cast;
  const background = node.background ?? scene.background;

  const visibleIdx =
    firstVisibleIndex(node, state.lineIndex, pc.flags, pc.stats);
  const displayIndex = visibleIdx ?? node.lines.length;
  const currentLine: Line = state.improvText
    ? { speaker: node.improv?.npc ?? "npc", text: state.improvText }
    : (visibleIdx !== null && node.lines[visibleIdx]) ||
      { speaker: "narration", text: "…" };
  const atEndOfLines =
    firstVisibleIndex(node, displayIndex + 1, pc.flags, pc.stats) === null;

  const applyEffects = useCallback(
    (effects: Effect[] | undefined) => {
      if (!effects) return;
      for (const e of effects) {
        switch (e.kind) {
          case "stat":
            applyStat(e.target, e.delta);
            break;
          case "flag":
            setFlag(e.key, e.value);
            break;
          case "memory":
            addMemory(e.text);
            break;
          case "goto":
            onEvent({ kind: "goto", scene: e.scene });
            break;
          case "chapterComplete":
            onEvent({
              kind: "chapterComplete",
              chapter: e.chapter,
              nextChapter: e.nextChapter,
            });
            break;
          case "end":
            onEvent({ kind: "end", outcome: e.outcome });
            break;
        }
      }
    },
    [applyStat, setFlag, addMemory, onEvent],
  );

  const applyCurrentLineEffectsOnce = useCallback(() => {
    if (visibleIdx === null) return;
    const key = `${state.nodeId}:${visibleIdx}`;
    if (appliedRef.current.has(key)) return;
    appliedRef.current.add(key);
    applyEffects(node.lines[visibleIdx]?.effects);
  }, [state.nodeId, visibleIdx, node.lines, applyEffects]);

  const advance = useCallback(() => {
    if (state.improvText) {
      setState((s) => ({ ...s, improvText: undefined }));
      return;
    }
    applyCurrentLineEffectsOnce();
    setState((prev) => {
      const n = scene.nodes[prev.nodeId];
      const fromIdx = displayIndex + 1;
      const nextIdx = firstVisibleIndex(n, fromIdx, pc.flags, pc.stats);
      if (nextIdx !== null) {
        return { ...prev, lineIndex: nextIdx };
      }
      if (n.next) {
        appliedRef.current.clear();
        return { nodeId: n.next, lineIndex: 0 };
      }
      return prev;
    });
  }, [
    state.improvText,
    applyCurrentLineEffectsOnce,
    scene,
    displayIndex,
    pc.flags,
    pc.stats,
  ]);

  const runChoice = useCallback(
    (choice: Choice) => {
      applyCurrentLineEffectsOnce();
      if (choice.check) {
        const result = rollCheck(choice.check, pc.stats);
        setLastCheck(result);
        onEvent({ kind: "check", result, label: choice.label });
        const branch = result.success ? choice.success : choice.failure;
        if (!branch) return;
        applyEffects(branch.effects);
        if (branch.next) {
          appliedRef.current.clear();
          setState({ nodeId: branch.next, lineIndex: 0 });
        }
        return;
      }
      applyEffects(choice.effects);
      if (choice.next) {
        appliedRef.current.clear();
        setState({ nodeId: choice.next, lineIndex: 0 });
      }
    },
    [applyCurrentLineEffectsOnce, pc.stats, onEvent, applyEffects],
  );

  const runImprov = useCallback(
    async (playerLine: string) => {
      if (!node.improv) return;
      const improv = node.improv;
      setBusy(true);
      setImprovError(null);
      try {
        const res = await fetch("/api/dialogue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            npcId: improv.npc,
            systemPrompt: improv.systemPrompt,
            history: [],
            playerLine,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`LLM ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
        }
        const { reply } = (await res.json()) as { reply: string };
        setState((s) => ({ ...s, improvText: reply }));

        const trigger = improv.triggers.find((t) =>
          reply.includes(t.keyword),
        );
        if (trigger) {
          applyEffects(trigger.effects);
          setTimeout(() => {
            appliedRef.current.clear();
            setState({ nodeId: trigger.next, lineIndex: 0 });
          }, 2000);
        }
      } catch (err) {
        setImprovError(
          err instanceof Error ? err.message : "응답 실패",
        );
      } finally {
        setBusy(false);
      }
    },
    [node.improv, applyEffects],
  );

  const choices = useMemo(() => {
    if (!atEndOfLines || state.improvText) return [];
    return (node.choices ?? []).filter((c) =>
      choiceAvailable(pc.flags, pc.stats, c),
    );
  }, [atEndOfLines, state.improvText, node.choices, pc.flags, pc.stats]);

  const isImprovNode =
    atEndOfLines &&
    !state.improvText &&
    !node.next &&
    !node.choices?.length &&
    !!node.improv;

  const suggestions = isImprovNode ? (node.improv?.suggestions ?? []) : [];

  return {
    background,
    cast,
    currentLine,
    choices,
    advance,
    runChoice,
    runImprov,
    isImprovNode,
    suggestions,
    busy,
    lastCheck,
    improvError,
    dismissImprovError: () => setImprovError(null),
  };
}
