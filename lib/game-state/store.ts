"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Stat } from "@/lib/pc/stats";

type FlagValue = boolean | string | number;

export type PcState = {
  name: string;
  stats: Record<Stat, number>;
  flags: Record<string, FlagValue>;
  memory: string[];
};

export type ChoiceAlternative = {
  id: string;
  label: string;
  /** Present when the alternative had a skill check. */
  check?: { stat: Stat; dc: number };
};

export type ChoiceLogEntry = {
  scene: string;
  node: string;
  choiceId: string;
  choiceLabel: string;
  /**
   * Legacy count-only fallback for v2 saves. New entries write `alternatives`
   * instead and leave this as the length for backwards display.
   */
  alternativeCount: number;
  /**
   * Full list of OTHER choices visible at the moment of this pick. The picked
   * choice is not included. v3+ only; v2 saves leave this undefined and the
   * path view falls back to alternativeCount "?" chips.
   */
  alternatives?: ChoiceAlternative[];
  /** Set only for skill-check choices. */
  success?: boolean;
  /** The stat the check ran against — used for end-of-chapter allocation math. */
  checkStat?: Stat;
  /** DC of the check, for path-view badge display. */
  checkDc?: number;
  /** Minimal state snapshot at the moment of this pick, enabling rewind. */
  rewind?: RewindSnapshot;
  timestamp: number;
};

/**
 * Everything needed to resume play at a prior decision point. We don't store
 * the full SaveState (that would contain choiceLog recursively) — just the
 * player state, scene position, and completed-chapters list.
 */
export type RewindSnapshot = {
  pc: PcState;
  currentChapter: string;
  currentScene: string;
  resumeNode: string;
  completedChapters: string[];
};

/**
 * Pool of points the player can spend on stats at the start of the next
 * chapter, earned from successful skill checks in the chapter that just ended.
 * Cleared once applied.
 */
export type PendingAllocation = {
  /** Chapter id the points were earned in (for display). */
  fromChapter: string;
  /** Point budget — usually 1~2 per chapter. */
  points: number;
  /** Success count per stat in the completed chapter (used for recommendations). */
  successesByStat: Partial<Record<Stat, number>>;
};

export type SaveState = {
  pc: PcState;
  currentChapter: string;
  currentScene: string;
  history: string[];
  completedChapters: string[];
  choiceLog: ChoiceLogEntry[];
  pendingAllocation: PendingAllocation | null;
  /**
   * When set, the next scene mount will resume at this node id instead of
   * scene.entry. Cleared after consumption. Used by the path-view rewind.
   */
  resumePoint: string | null;
  /** Last write timestamp, for the title screen "마지막 저장" hint. */
  updatedAt: number;
};

type Actions = {
  startNew: (opts: { chapter: string; scene: string }) => void;
  applyStat: (stat: Stat, delta: number) => void;
  setFlag: (key: string, value: FlagValue) => void;
  addMemory: (text: string) => void;
  goToScene: (sceneId: string) => void;
  completeChapter: (chapter: string, nextChapter?: string) => void;
  logChoice: (entry: Omit<ChoiceLogEntry, "timestamp">) => void;
  setPendingAllocation: (allocation: PendingAllocation | null) => void;
  applyAllocation: (picks: Partial<Record<Stat, number>>) => void;
  /**
   * Rewind play state to a prior decision point. Restores pc + scene +
   * completedChapters, truncates choiceLog past `beforeLogIndex`, and sets
   * resumePoint so the next mount starts at the choice node, not scene entry.
   */
  rewindToDecision: (
    beforeLogIndex: number,
    snapshot: RewindSnapshot,
  ) => void;
  consumeResumePoint: () => string | null;
  reset: () => void;
  loadSnapshot: (snap: SaveState) => void;
};

const INITIAL_PC: PcState = {
  name: "백승재",
  stats: {
    gwonmo: 3,
    beopri: 2,
    jikgam: 2,
    ttuksim: 2,
    inmaek: 2,
    yangsim: 2,
  },
  flags: {},
  memory: [],
};

const INITIAL_STATE: SaveState = {
  pc: INITIAL_PC,
  currentChapter: "",
  currentScene: "",
  history: [],
  completedChapters: [],
  choiceLog: [],
  pendingAllocation: null,
  resumePoint: null,
  updatedAt: 0,
};

export const useSave = create<SaveState & Actions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      startNew: ({ chapter, scene }) =>
        set(() => ({
          ...INITIAL_STATE,
          pc: { ...INITIAL_PC, stats: { ...INITIAL_PC.stats } },
          currentChapter: chapter,
          currentScene: scene,
          history: [scene],
          updatedAt: Date.now(),
        })),
      applyStat: (stat, delta) =>
        set((s) => ({
          pc: {
            ...s.pc,
            stats: {
              ...s.pc.stats,
              [stat]: Math.max(0, Math.min(10, s.pc.stats[stat] + delta)),
            },
          },
          updatedAt: Date.now(),
        })),
      setFlag: (key, value) =>
        set((s) => ({
          pc: { ...s.pc, flags: { ...s.pc.flags, [key]: value } },
          updatedAt: Date.now(),
        })),
      addMemory: (text) =>
        set((s) => ({
          pc: { ...s.pc, memory: [...s.pc.memory, text] },
          updatedAt: Date.now(),
        })),
      goToScene: (sceneId) =>
        set((s) => ({
          currentScene: sceneId,
          history: [...s.history, sceneId],
          updatedAt: Date.now(),
        })),
      completeChapter: (chapter, nextChapter) =>
        set((s) => ({
          completedChapters: [...s.completedChapters, chapter],
          currentChapter: nextChapter ?? s.currentChapter,
          updatedAt: Date.now(),
        })),
      logChoice: (entry) =>
        set((s) => ({
          choiceLog: [
            ...s.choiceLog,
            { ...entry, timestamp: Date.now() },
          ],
          updatedAt: Date.now(),
        })),
      setPendingAllocation: (allocation) =>
        set(() => ({ pendingAllocation: allocation })),
      applyAllocation: (picks) =>
        set((s) => {
          // Allocation can raise a stat toward 6 but never past it. If a stat
          // is already at 6+ (via choice effects), allocation skips it.
          const next = { ...s.pc.stats };
          for (const [stat, delta] of Object.entries(picks)) {
            if (!delta) continue;
            const current = next[stat as Stat] ?? 0;
            if (current >= 6) continue;
            next[stat as Stat] = Math.min(6, current + delta);
          }
          return {
            pc: { ...s.pc, stats: next },
            pendingAllocation: null,
          };
        }),
      rewindToDecision: (beforeLogIndex, snapshot) =>
        set((s) => ({
          pc: snapshot.pc,
          currentChapter: snapshot.currentChapter,
          currentScene: snapshot.currentScene,
          completedChapters: snapshot.completedChapters,
          choiceLog: s.choiceLog.slice(0, beforeLogIndex),
          resumePoint: snapshot.resumeNode,
          pendingAllocation: null,
          history: [...s.history, snapshot.currentScene],
        })),
      consumeResumePoint: () => {
        const point = get().resumePoint;
        if (point) set({ resumePoint: null });
        return point;
      },
      reset: () => set(() => ({ ...INITIAL_STATE, pc: { ...INITIAL_PC, stats: { ...INITIAL_PC.stats } } })),
      loadSnapshot: (snap) =>
        set(() => ({
          pc: snap.pc,
          currentChapter: snap.currentChapter,
          currentScene: snap.currentScene,
          history: snap.history,
          completedChapters: snap.completedChapters,
          choiceLog: snap.choiceLog ?? [],
          pendingAllocation: snap.pendingAllocation ?? null,
          resumePoint: snap.resumePoint ?? null,
          updatedAt: snap.updatedAt ?? 0,
        })),
    }),
    {
      name: "euljiro-save",
      storage: createJSONStorage(() => localStorage),
      version: 4,
      migrate: (persisted, fromVersion) => {
        const s = (persisted ?? {}) as Partial<SaveState>;
        if (fromVersion < 2) {
          s.choiceLog = s.choiceLog ?? [];
        }
        if (fromVersion < 3) {
          s.pendingAllocation = s.pendingAllocation ?? null;
        }
        if (fromVersion < 4) {
          s.resumePoint = s.resumePoint ?? null;
          s.updatedAt = s.updatedAt ?? 0;
        }
        return s as SaveState;
      },
    },
  ),
);
