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
  const [lastImprovInput, setLastImprovInput] = useState<string | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<string | null>(null);
  const appliedRef = useRef<Set<string>>(new Set());

  const pc = useSave((s) => s.pc);
  const applyStat = useSave((s) => s.applyStat);
  const setFlag = useSave((s) => s.setFlag);
  const addMemory = useSave((s) => s.addMemory);
  const logChoice = useSave((s) => s.logChoice);

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

  // All lines from the start of this node up to and including the current one
  // that pass `requires` — used by the kakao view to render an accumulating
  // chat thread. The standard view ignores this and shows only `currentLine`.
  const visibleLinesSoFar: Line[] = useMemo(() => {
    if (visibleIdx === null) return [];
    const out: Line[] = [];
    for (let i = 0; i <= visibleIdx; i++) {
      if (matchesRequires(node.lines[i].requires, pc.flags, pc.stats)) {
        out.push(node.lines[i]);
      }
    }
    return out;
  }, [node.lines, visibleIdx, pc.flags, pc.stats]);

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
      if (pendingTrigger) {
        appliedRef.current.clear();
        setState({ nodeId: pendingTrigger, lineIndex: 0 });
        setPendingTrigger(null);
      } else {
        setState((s) => ({ ...s, improvText: undefined }));
      }
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
    pendingTrigger,
    applyCurrentLineEffectsOnce,
    scene,
    displayIndex,
    pc.flags,
    pc.stats,
  ]);

  const runChoice = useCallback(
    (choice: Choice) => {
      applyCurrentLineEffectsOnce();
      // Count of other choices visible at the moment of this pick — used later
      // by the path view to display "? ×N" placeholders without revealing labels.
      const alternativeCount = Math.max(
        0,
        (node.choices ?? []).filter((c) =>
          choiceAvailable(pc.flags, pc.stats, c),
        ).length - 1,
      );
      if (choice.check) {
        const result = rollCheck(choice.check, pc.stats);
        setLastCheck(result);
        onEvent({ kind: "check", result, label: choice.label });
        logChoice({
          scene: scene.id,
          node: state.nodeId,
          choiceId: choice.id,
          choiceLabel: choice.label,
          alternativeCount,
          success: result.success,
          checkStat: choice.check.stat,
        });
        const branch = result.success ? choice.success : choice.failure;
        if (!branch) return;
        applyEffects(branch.effects);
        if (branch.next) {
          appliedRef.current.clear();
          setState({ nodeId: branch.next, lineIndex: 0 });
        }
        return;
      }
      logChoice({
        scene: scene.id,
        node: state.nodeId,
        choiceId: choice.id,
        choiceLabel: choice.label,
        alternativeCount,
      });
      applyEffects(choice.effects);
      if (choice.next) {
        appliedRef.current.clear();
        setState({ nodeId: choice.next, lineIndex: 0 });
      }
    },
    [
      applyCurrentLineEffectsOnce,
      pc.stats,
      pc.flags,
      onEvent,
      applyEffects,
      logChoice,
      scene.id,
      state.nodeId,
      node.choices,
    ],
  );

  const runImprov = useCallback(
    async (playerLine: string) => {
      if (!node.improv) return;
      const improv = node.improv;
      setBusy(true);
      setImprovError(null);
      setLastImprovInput(playerLine);
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
          let detail = "";
          try {
            const body = (await res.json()) as {
              error?: string;
              detail?: string;
            };
            detail = [body.error, body.detail].filter(Boolean).join(" — ");
          } catch {
            detail = await res.text().catch(() => "");
          }
          throw new Error(
            detail ? `${res.status}: ${detail.slice(0, 160)}` : `${res.status}`,
          );
        }
        const { reply } = (await res.json()) as { reply: string };

        // Strip every configured trigger keyword before showing the line.
        // The raw reply is still checked for routing so the keyword never
        // leaks to the player.
        let display = reply;
        for (const t of improv.triggers) {
          display = display.split(t.keyword).join("");
        }
        display = display.trim();

        setState((s) => ({ ...s, improvText: display }));

        const trigger = improv.triggers.find((t) =>
          reply.includes(t.keyword),
        );
        if (trigger) {
          applyEffects(trigger.effects);
          // Do not auto-advance. Store the pending trigger; the next
          // "다음 ▶" tap transitions to trigger.next so the player sets
          // the reading pace.
          setPendingTrigger(trigger.next);
        }
      } catch (err) {
        setImprovError(err instanceof Error ? err.message : "응답 실패");
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

  const retryImprov = useCallback(() => {
    if (lastImprovInput) runImprov(lastImprovInput);
  }, [lastImprovInput, runImprov]);

  return {
    background,
    cast,
    mode: node.mode,
    currentLine,
    visibleLinesSoFar,
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
    canRetryImprov: !!lastImprovInput && !busy,
    retryImprov,
  };
}
