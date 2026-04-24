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
  timestamp: number;
};

export type SaveState = {
  pc: PcState;
  currentChapter: string;
  currentScene: string;
  history: string[];
  completedChapters: string[];
  choiceLog: ChoiceLogEntry[];
};

type Actions = {
  startNew: (opts: { chapter: string; scene: string }) => void;
  applyStat: (stat: Stat, delta: number) => void;
  setFlag: (key: string, value: FlagValue) => void;
  addMemory: (text: string) => void;
  goToScene: (sceneId: string) => void;
  completeChapter: (chapter: string, nextChapter?: string) => void;
  logChoice: (entry: Omit<ChoiceLogEntry, "timestamp">) => void;
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
      reset: () => set(() => ({ ...INITIAL_STATE, pc: { ...INITIAL_PC, stats: { ...INITIAL_PC.stats } } })),
      loadSnapshot: (snap) =>
        set(() => ({
          pc: snap.pc,
          currentChapter: snap.currentChapter,
          currentScene: snap.currentScene,
          history: snap.history,
          completedChapters: snap.completedChapters,
          choiceLog: snap.choiceLog ?? [],
        })),
    }),
    {
      name: "euljiro-save",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, fromVersion) => {
        const s = (persisted ?? {}) as Partial<SaveState>;
        if (fromVersion < 2) {
          return { ...s, choiceLog: s.choiceLog ?? [] } as SaveState;
        }
        return s as SaveState;
      },
    },
  ),
);
