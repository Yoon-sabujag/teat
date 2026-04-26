import { z } from "zod";

const StatEnum = z.enum([
  "gwonmo",
  "beopri",
  "jikgam",
  "ttuksim",
  "inmaek",
  "yangsim",
]);

const Position = z.enum(["left", "center", "right", "offscreen"]);
const Expression = z.enum([
  "neutral",
  "smile",
  "tense",
  "weary",
  "angry",
  "shock",
  "grim",
  "amused",
]);

const Effect = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("stat"), target: StatEnum, delta: z.number() }),
  z.object({
    kind: z.literal("flag"),
    key: z.string(),
    value: z.union([z.boolean(), z.string(), z.number()]),
  }),
  z.object({ kind: z.literal("memory"), text: z.string() }),
  z.object({ kind: z.literal("goto"), scene: z.string() }),
  z.object({
    kind: z.literal("chapterComplete"),
    chapter: z.string(),
    nextChapter: z.string().optional(),
  }),
  z.object({ kind: z.literal("end"), outcome: z.string() }),
]);

const LineRequires = z.object({
  flag: z.string().optional(),
  flagEquals: z
    .object({
      key: z.string(),
      value: z.union([z.boolean(), z.string(), z.number()]),
    })
    .optional(),
  flagNotEquals: z
    .object({
      key: z.string(),
      value: z.union([z.boolean(), z.string(), z.number()]),
    })
    .optional(),
  flagEqualsAll: z
    .array(
      z.object({
        key: z.string(),
        value: z.union([z.boolean(), z.string(), z.number()]),
      }),
    )
    .optional(),
  minStat: z.object({ stat: StatEnum, value: z.number() }).optional(),
  maxStat: z.object({ stat: StatEnum, value: z.number() }).optional(),
});

const Line = z.object({
  speaker: z.string(),
  text: z.string(),
  expression: Expression.optional(),
  position: Position.optional(),
  effects: z.array(Effect).optional(),
  requires: LineRequires.optional(),
});

const Branch = z.object({
  next: z.string().optional(),
  effects: z.array(Effect).optional(),
  line: z
    .object({ speaker: z.string(), text: z.string() })
    .optional(),
});

const Choice = z.object({
  id: z.string(),
  label: z.string(),
  requires: z
    .object({
      flag: z.string().optional(),
      flagEquals: z
        .object({
          key: z.string(),
          value: z.union([z.boolean(), z.string(), z.number()]),
        })
        .optional(),
      flagNotEquals: z
        .object({
          key: z.string(),
          value: z.union([z.boolean(), z.string(), z.number()]),
        })
        .optional(),
      minStat: z
        .object({ stat: StatEnum, value: z.number() })
        .optional(),
      maxStat: z
        .object({ stat: StatEnum, value: z.number() })
        .optional(),
    })
    .optional(),
  check: z.object({ stat: StatEnum, dc: z.number() }).optional(),
  next: z.string().optional(),
  effects: z.array(Effect).optional(),
  success: Branch.optional(),
  failure: Branch.optional(),
});

const CastMember = z.object({
  npc: z.string(),
  position: Position,
  expression: Expression.optional(),
});

const Node = z.object({
  id: z.string(),
  cast: z.array(CastMember).optional(),
  background: z.string().optional(),
  mode: z.literal("kakao").optional(),
  lines: z.array(Line),
  choices: z.array(Choice).optional(),
  next: z.string().optional(),
  improv: z
    .object({
      npc: z.string(),
      triggers: z.array(
        z.object({
          keyword: z.string(),
          next: z.string(),
          effects: z.array(Effect).optional(),
        }),
      ),
      systemPrompt: z.string(),
      suggestions: z.array(z.string()).optional(),
    })
    .optional(),
});

export const SceneSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  background: z.string(),
  cast: z.array(CastMember),
  entry: z.string(),
  nodes: z.record(z.string(), Node),
});

export const ChapterSchema = z.object({
  id: z.string(),
  title: z.string(),
  scenes: z.array(z.string()),
});

export const CampaignSchema = z.object({
  id: z.string(),
  title: z.string(),
  startChapter: z.string(),
  chapters: z.array(ChapterSchema),
});

export type ParsedScene = z.infer<typeof SceneSchema>;
export type ParsedCampaign = z.infer<typeof CampaignSchema>;
