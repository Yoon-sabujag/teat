import { z } from "zod";

const Expression = z.enum([
  "neutral",
  "smile",
  "annoyed",
  "skeptical",
  "entranced",
  "afraid",
]);

const Effect = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("faith"), delta: z.number() }),
  z.object({ kind: z.literal("suspicion"), delta: z.number() }),
  z.object({ kind: z.literal("flag"), key: z.string(), value: z.boolean() }),
  z.object({
    kind: z.literal("end"),
    outcome: z.enum(["success", "flee"]),
  }),
]);

const Line = z.object({
  speaker: z.enum(["npc", "player", "companion", "narration"]),
  text: z.string(),
  expression: Expression.optional(),
  effects: z.array(Effect).optional(),
});

const Choice = z.object({
  id: z.string(),
  label: z.string(),
  next: z.string(),
  requires: z
    .object({
      flag: z.string().optional(),
      minFaith: z.number().optional(),
      maxSuspicion: z.number().optional(),
    })
    .optional(),
  effects: z.array(Effect).optional(),
});

const Node = z.object({
  id: z.string(),
  lines: z.array(Line),
  choices: z.array(Choice).optional(),
  next: z.string().optional(),
  improv: z
    .object({
      triggers: z.array(
        z.object({ keyword: z.string(), next: z.string() }),
      ),
      systemPrompt: z.string(),
    })
    .optional(),
});

export const ScriptSchema = z.object({
  id: z.string(),
  entry: z.string(),
  nodes: z.record(z.string(), Node),
});

export type ParsedScript = z.infer<typeof ScriptSchema>;
