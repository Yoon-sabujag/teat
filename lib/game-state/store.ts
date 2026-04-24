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

export type ChoiceLogEntry = {
  scene: string;
  node: string;
  choiceId: string;
  choiceLabel: string;
  /** How many other choices were visible at this node when the pick happened. */
  alternativeCount: number;
  /** Set only for skill-check choices. */
  success?: boolean;
  /** The stat the check ran against — used for end-of-chapter allocation math. */
  checkStat?: Stat;
  timestamp: number;
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
};

export const useSave = create<SaveState & Actions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      startNew: ({ chapter, scene }) =>
        set(() => ({
          ...INITIAL_STATE,
          pc: { ...INITIAL_PC, stats: { ...INITIAL_PC.stats } },
          currentChapter: chapter,
          currentScene: scene,
          history: [scene],
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
        })),
      setFlag: (key, value) =>
        set((s) => ({ pc: { ...s.pc, flags: { ...s.pc.flags, [key]: value } } })),
      addMemory: (text) =>
        set((s) => ({ pc: { ...s.pc, memory: [...s.pc.memory, text] } })),
      goToScene: (sceneId) =>
        set((s) => ({
          currentScene: sceneId,
          history: [...s.history, sceneId],
        })),
      completeChapter: (chapter, nextChapter) =>
        set((s) => ({
          completedChapters: [...s.completedChapters, chapter],
          currentChapter: nextChapter ?? s.currentChapter,
        })),
      logChoice: (entry) =>
        set((s) => ({
          choiceLog: [
            ...s.choiceLog,
            { ...entry, timestamp: Date.now() },
          ],
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
        })),
    }),
    {
      name: "euljiro-save",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, fromVersion) => {
        const s = (persisted ?? {}) as Partial<SaveState>;
        if (fromVersion < 2) {
          s.choiceLog = s.choiceLog ?? [];
        }
        if (fromVersion < 3) {
          s.pendingAllocation = s.pendingAllocation ?? null;
        }
        return s as SaveState;
      },
    },
  ),
);
