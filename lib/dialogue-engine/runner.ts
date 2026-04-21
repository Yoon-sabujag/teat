"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Choice, Effect, Line, RunnerState, Script } from "./types";
import type { Npc, Relative } from "@/lib/social-graph/types";
import { useGameStore } from "@/lib/game-state/store";

export type CharacterRef = { id: string; displayName: string };

export type RunnerArgs =
  | {
      mode: "conversion";
      script: Script;
      npc: Npc;
    }
  | {
      mode: "coop";
      script: Script;
      follower: Npc;
      target: Relative;
    };

type Ending = "success" | "flee" | null;

function applyEffects(state: RunnerState, effects: Effect[] | undefined) {
  if (!effects) return { state, ending: null as Ending };
  let ending: Ending = null;
  const next = { ...state, flags: { ...state.flags } };
  for (const e of effects) {
    switch (e.kind) {
      case "faith":
        next.faith += e.delta;
        break;
      case "suspicion":
        next.suspicion += e.delta;
        break;
      case "flag":
        next.flags[e.key] = e.value;
        break;
      case "end":
        ending = e.outcome;
        break;
    }
  }
  return { state: next, ending };
}

function choiceAvailable(state: RunnerState, choice: Choice) {
  const r = choice.requires;
  if (!r) return true;
  if (r.flag && !state.flags[r.flag]) return false;
  if (r.minFaith !== undefined && state.faith < r.minFaith) return false;
  if (r.maxSuspicion !== undefined && state.suspicion > r.maxSuspicion)
    return false;
  return true;
}

export function useSceneRunner(args: RunnerArgs) {
  const { script } = args;
  const [state, setState] = useState<RunnerState>({
    nodeId: script.entry,
    lineIndex: 0,
    faith: 0,
    suspicion: 0,
    flags: {},
  });
  const [ending, setEnding] = useState<Ending>(null);
  const [busy, setBusy] = useState(false);
  const [improvLine, setImprovLine] = useState<Line | null>(null);
  const appliedLinesRef = useRef<Set<string>>(new Set());

  const convertNpc = useGameStore((s) => s.convertNpc);
  const recordCoopOutcome = useGameStore((s) => s.recordCoopOutcome);

  const primary: CharacterRef =
    args.mode === "conversion" ? args.npc : args.target;
  const companion: CharacterRef | undefined =
    args.mode === "coop" ? args.follower : undefined;

  const node = script.nodes[state.nodeId];
  if (!node) throw new Error(`Missing node: ${state.nodeId}`);

  const currentLine: Line =
    improvLine ?? node.lines[state.lineIndex] ?? {
      speaker: "narration",
      text: "…",
    };

  const atEndOfLines = state.lineIndex >= node.lines.length - 1;

  const commitEnding = useCallback(
    (outcome: "success" | "flee") => {
      setEnding(outcome);
      if (args.mode === "conversion" && outcome === "success") {
        convertNpc(args.npc);
      } else if (args.mode === "coop") {
        recordCoopOutcome(args.follower.id, args.target.id, outcome);
      }
    },
    [args, convertNpc, recordCoopOutcome],
  );

  const advance = useCallback(() => {
    setImprovLine(null);
    setState((prev) => {
      const n = script.nodes[prev.nodeId];
      const key = `${prev.nodeId}:${prev.lineIndex}`;
      let after = prev;
      if (!appliedLinesRef.current.has(key)) {
        appliedLinesRef.current.add(key);
        const result = applyEffects(prev, n.lines[prev.lineIndex]?.effects);
        after = result.state;
        if (result.ending) commitEnding(result.ending);
      }
      if (prev.lineIndex < n.lines.length - 1) {
        return { ...after, lineIndex: prev.lineIndex + 1 };
      }
      if (n.next) {
        return { ...after, nodeId: n.next, lineIndex: 0 };
      }
      return after;
    });
  }, [script, commitEnding]);

  const onChoose = useCallback(
    (choiceId: string) => {
      const n = script.nodes[state.nodeId];
      const choice = n.choices?.find((c) => c.id === choiceId);
      if (!choice || !choiceAvailable(state, choice)) return;
      const lineKey = `${state.nodeId}:${state.lineIndex}`;
      let after = state;
      if (!appliedLinesRef.current.has(lineKey)) {
        appliedLinesRef.current.add(lineKey);
        const lineResult = applyEffects(
          state,
          n.lines[state.lineIndex]?.effects,
        );
        after = lineResult.state;
        if (lineResult.ending) commitEnding(lineResult.ending);
      }
      const { state: next, ending: e } = applyEffects(after, choice.effects);
      if (e) commitEnding(e);
      setState({ ...next, nodeId: choice.next, lineIndex: 0 });
      setImprovLine(null);
    },
    [script, state, commitEnding],
  );

  const onFreeform = useCallback(
    async (playerLine: string) => {
      if (!node.improv) return;
      setBusy(true);
      try {
        const res = await fetch("/api/dialogue", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            npcId: primary.id,
            systemPrompt: node.improv.systemPrompt,
            history: [],
            playerLine,
          }),
        });
        const { reply } = (await res.json()) as { reply: string };
        setImprovLine({ speaker: "npc", text: reply });

        const trigger = node.improv.triggers.find((t) =>
          reply.includes(t.keyword),
        );
        if (trigger) {
          setState((prev) => ({ ...prev, nodeId: trigger.next, lineIndex: 0 }));
        }
      } finally {
        setBusy(false);
      }
    },
    [node, primary],
  );

  const choices = useMemo(() => {
    if (!atEndOfLines) return [];
    return (node.choices ?? []).filter((c) => choiceAvailable(state, c));
  }, [atEndOfLines, node, state]);

  const isImprovNode =
    atEndOfLines && !node.next && !node.choices?.length && !!node.improv;

  return {
    currentLine,
    choices,
    onChoose,
    onAdvance: advance,
    onFreeform,
    isImprovNode,
    busy,
    ending,
    state,
    primary,
    companion,
  };
}
