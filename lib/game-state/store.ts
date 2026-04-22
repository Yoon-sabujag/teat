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

type SaveState = {
  pc: PcState;
  currentChapter: string;
  currentScene: string;
  history: string[];
  completedChapters: string[];
};

type Actions = {
  startNew: (opts: { chapter: string; scene: string }) => void;
  applyStat: (stat: Stat, delta: number) => void;
  setFlag: (key: string, value: FlagValue) => void;
  addMemory: (text: string) => void;
  goToScene: (sceneId: string) => void;
  completeChapter: (chapter: string, nextChapter?: string) => void;
  reset: () => void;
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
      reset: () => set(() => ({ ...INITIAL_STATE, pc: { ...INITIAL_PC, stats: { ...INITIAL_PC.stats } } })),
    }),
    {
      name: "euljiro-save",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
