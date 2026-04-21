import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import type { Npc, Relative } from "./types";

const RelationKind = z.enum([
  "mother",
  "father",
  "sister",
  "brother",
  "friend",
  "partner",
  "coworker",
]);

const RelativeSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  relation: RelationKind,
  resistance: z.number().min(0).max(10),
  coopScriptId: z.string(),
});

const NpcSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  hook: z.string(),
  introScriptId: z.string(),
  relatives: z.array(RelativeSchema),
});

const NPC_DIR = path.join(process.cwd(), "content", "npcs");

const cache = new Map<string, Npc>();

function load(id: string): Npc | null {
  const cached = cache.get(id);
  if (cached) return cached;
  const file = path.join(NPC_DIR, `${id}.yaml`);
  if (!fs.existsSync(file)) return null;
  const parsed = NpcSchema.parse(yaml.load(fs.readFileSync(file, "utf8")));
  cache.set(id, parsed);
  return parsed;
}

export function loadNpc(id: string): Npc | null {
  return load(id);
}

export function loadRelative(
  npcId: string,
  relativeId: string,
): Relative | null {
  const npc = load(npcId);
  if (!npc) return null;
  return npc.relatives.find((r) => r.id === relativeId) ?? null;
}

export function listAvailableProspects(): Array<
  Pick<Npc, "id" | "displayName" | "hook">
> {
  const files = fs.readdirSync(NPC_DIR).filter((f) => f.endsWith(".yaml"));
  return files
    .map((f) => load(path.basename(f, ".yaml")))
    .filter((n): n is Npc => n !== null)
    .map(({ id, displayName, hook }) => ({ id, displayName, hook }));
}
