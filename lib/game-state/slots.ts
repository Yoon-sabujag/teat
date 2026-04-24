"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PcState, ChoiceLogEntry, PendingAllocation } from "./store";

export type SlotSnapshot = {
  pc: PcState;
  currentChapter: string;
  currentScene: string;
  history: string[];
  completedChapters: string[];
  choiceLog: ChoiceLogEntry[];
  pendingAllocation: PendingAllocation | null;
  updatedAt: number;
};

export type SlotIndex = 0 | 1 | 2;

type SlotsState = {
  slots: [SlotSnapshot | null, SlotSnapshot | null, SlotSnapshot | null];
  activeSlot: SlotIndex | null;
};

type SlotsActions = {
  writeToSlot: (i: SlotIndex, snap: SlotSnapshot) => void;
  clearSlot: (i: SlotIndex) => void;
  setActiveSlot: (i: SlotIndex | null) => void;
};

export const useSlots = create<SlotsState & SlotsActions>()(
  persist(
    (set) => ({
      slots: [null, null, null],
      activeSlot: null,
      writeToSlot: (i, snap) =>
        set((s) => {
          const next = [...s.slots] as SlotsState["slots"];
          next[i] = snap;
          return { slots: next };
        }),
      clearSlot: (i) =>
        set((s) => {
          const next = [...s.slots] as SlotsState["slots"];
          next[i] = null;
          return {
            slots: next,
            activeSlot: s.activeSlot === i ? null : s.activeSlot,
          };
        }),
      setActiveSlot: (i) => set({ activeSlot: i }),
    }),
    {
      name: "euljiro-slots",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
