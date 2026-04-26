import type { Stat, SkillCheck } from "@/lib/pc/stats";

export type Speaker = "narration" | "pc" | "thought" | string;

export type Expression =
  | "neutral"
  | "smile"
  | "tense"
  | "weary"
  | "angry"
  | "shock"
  | "grim"
  | "amused";

export type Position = "left" | "center" | "right" | "offscreen";

export type Effect =
  | { kind: "stat"; target: Stat; delta: number }
  | { kind: "flag"; key: string; value: boolean | string | number }
  | { kind: "memory"; text: string }
  | { kind: "goto"; scene: string }
  | { kind: "chapterComplete"; chapter: string; nextChapter?: string }
  | { kind: "end"; outcome: string };

export type LineRequires = {
  flag?: string;
  flagEquals?: { key: string; value: boolean | string | number };
  flagNotEquals?: { key: string; value: boolean | string | number };
  /** AND of multiple equals checks, useful when one flag isn't enough. */
  flagEqualsAll?: Array<{ key: string; value: boolean | string | number }>;
  minStat?: { stat: Stat; value: number };
  maxStat?: { stat: Stat; value: number };
};

export type Line = {
  speaker: Speaker;
  text: string;
  expression?: Expression;
  position?: Position;
  effects?: Effect[];
  /**
   * If set, the line is only rendered when all conditions match the PC's
   * current flags/stats. Used to give convergent nodes branch-specific
   * flavor without duplicating entire nodes.
   */
  requires?: LineRequires;
};

export type ChoiceRequires = {
  flag?: string;
  flagEquals?: { key: string; value: boolean | string | number };
  flagNotEquals?: { key: string; value: boolean | string | number };
  flagEqualsAll?: Array<{ key: string; value: boolean | string | number }>;
  minStat?: { stat: Stat; value: number };
  maxStat?: { stat: Stat; value: number };
};

export type Branch = {
  next?: string;
  effects?: Effect[];
  line?: { speaker: Speaker; text: string };
};

export type Choice = {
  id: string;
  label: string;
  requires?: ChoiceRequires;
  check?: SkillCheck;
  /** Used when no `check` present. */
  next?: string;
  effects?: Effect[];
  /** Used when `check` present. */
  success?: Branch;
  failure?: Branch;
};

export type CastMember = {
  npc: string;
  position: Position;
  expression?: Expression;
};

export type Node = {
  id: string;
  /** Changing any of these mid-scene is allowed to restage the scene. */
  cast?: CastMember[];
  background?: string;
  /**
   * Visual presentation mode for this node. Default is the standard
   * character-over-background view. `kakao` renders as a phone chat thread.
   */
  mode?: "kakao";
  lines: Line[];
  choices?: Choice[];
  next?: string;
  improv?: {
    npc: string;
    triggers: Array<{ keyword: string; next: string; effects?: Effect[] }>;
    systemPrompt: string;
    /**
     * Author-written starter questions. Shown as chips above the freeform
     * input so the player always has somewhere to poke when they're stuck.
     * Tapping a chip submits it directly.
     */
    suggestions?: string[];
  };
};

export type Scene = {
  id: string;
  title?: string;
  background: string;
  cast: CastMember[];
  entry: string;
  nodes: Record<string, Node>;
};

export type Chapter = {
  id: string;
  title: string;
  scenes: string[];
};

export type RunnerState = {
  nodeId: string;
  lineIndex: number;
  improvText?: string;
};
