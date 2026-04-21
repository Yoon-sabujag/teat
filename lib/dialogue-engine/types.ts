export type Speaker = "npc" | "player" | "companion" | "narration";

export type Expression =
  | "neutral"
  | "smile"
  | "annoyed"
  | "skeptical"
  | "entranced"
  | "afraid";

export type Effect =
  | { kind: "faith"; delta: number }
  | { kind: "suspicion"; delta: number }
  | { kind: "flag"; key: string; value: boolean }
  | { kind: "end"; outcome: "success" | "flee" };

export type Line = {
  speaker: Speaker;
  text: string;
  expression?: Expression;
  effects?: Effect[];
};

export type Choice = {
  id: string;
  label: string;
  next: string;
  requires?: { flag?: string; minFaith?: number; maxSuspicion?: number };
  effects?: Effect[];
};

export type Node = {
  id: string;
  lines: Line[];
  /**
   * If `choices` is empty and `next` is undefined, the engine hands control
   * over to the LLM for freeform improv until a trigger keyword or effect
   * routes back into a scripted node.
   */
  choices?: Choice[];
  next?: string;
  improv?: {
    triggers: Array<{ keyword: string; next: string }>;
    systemPrompt: string;
  };
};

export type Script = {
  id: string;
  entry: string;
  nodes: Record<string, Node>;
};

export type RunnerState = {
  nodeId: string;
  lineIndex: number;
  faith: number;
  suspicion: number;
  flags: Record<string, boolean>;
};
