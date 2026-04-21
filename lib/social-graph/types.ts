export type RelationKind =
  | "mother"
  | "father"
  | "sister"
  | "brother"
  | "friend"
  | "partner"
  | "coworker";

export type Relative = {
  id: string;
  displayName: string;
  relation: RelationKind;
  resistance: number;
  coopScriptId: string;
};

export type Npc = {
  id: string;
  displayName: string;
  hook: string;
  introScriptId: string;
  relatives: Relative[];
};
