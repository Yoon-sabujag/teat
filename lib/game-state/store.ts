"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Npc } from "@/lib/social-graph/types";

type PendingTarget = {
  id: string;
  displayName: string;
  relation: string;
};

export type Follower = {
  npcId: string;
  displayName: string;
  faith: number;
  pendingTargets: PendingTarget[];
  convertedTargets: string[];
};

type State = {
  followers: Record<string, Follower>;
  convertNpc: (npc: Npc) => void;
  trainFollower: (npcId: string, delta: number) => void;
  recordCoopOutcome: (
    followerId: string,
    targetId: string,
    outcome: "success" | "flee",
  ) => void;
  reset: () => void;
};

export const useGameStore = create<State>()(
  persist(
    (set) => ({
      followers: {},
      convertNpc: (npc) =>
        set((s) => {
          if (s.followers[npc.id]) return s;
          return {
            followers: {
              ...s.followers,
              [npc.id]: {
                npcId: npc.id,
                displayName: npc.displayName,
                faith: 1,
                pendingTargets: npc.relatives.map((r) => ({
                  id: r.id,
                  displayName: r.displayName,
                  relation: r.relation,
                })),
                convertedTargets: [],
              },
            },
          };
        }),
      trainFollower: (npcId, delta) =>
        set((s) => {
          const f = s.followers[npcId];
          if (!f) return s;
          return {
            followers: {
              ...s.followers,
              [npcId]: { ...f, faith: Math.max(0, f.faith + delta) },
            },
          };
        }),
      recordCoopOutcome: (followerId, targetId, outcome) =>
        set((s) => {
          const f = s.followers[followerId];
          if (!f) return s;
          const remaining = f.pendingTargets.filter((t) => t.id !== targetId);
          return {
            followers: {
              ...s.followers,
              [followerId]: {
                ...f,
                pendingTargets: remaining,
                convertedTargets:
                  outcome === "success"
                    ? [...f.convertedTargets, targetId]
                    : f.convertedTargets,
              },
            },
          };
        }),
      reset: () => set({ followers: {} }),
    }),
    {
      name: "teat-save",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
