import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import {
  CampaignSchema,
  SceneSchema,
  type ParsedCampaign,
  type ParsedScene,
} from "@/lib/dialogue-engine/schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

const NpcSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: z.string(),
  bio: z.string().optional(),
});

const BackgroundSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  file: z.string(),
});

export type Npc = z.infer<typeof NpcSchema>;
export type Background = z.infer<typeof BackgroundSchema>;

const sceneCache = new Map<string, ParsedScene>();
const npcCache = new Map<string, Npc>();
const bgCache = new Map<string, Background>();
let campaignCache: ParsedCampaign | null = null;

function readYaml(file: string): unknown {
  return yaml.load(fs.readFileSync(file, "utf8"));
}

export function loadCampaign(): ParsedCampaign {
  if (campaignCache) return campaignCache;
  const raw = readYaml(path.join(CONTENT_DIR, "campaign.yaml"));
  campaignCache = CampaignSchema.parse(raw);
  return campaignCache;
}

export function loadScene(id: string): ParsedScene {
  const cached = sceneCache.get(id);
  if (cached) return cached;
  const file = path.join(CONTENT_DIR, "scenes", `${id}.yaml`);
  const parsed = SceneSchema.parse(readYaml(file));
  sceneCache.set(id, parsed);
  return parsed;
}

export function loadNpc(id: string): Npc | null {
  const cached = npcCache.get(id);
  if (cached) return cached;
  const file = path.join(CONTENT_DIR, "npcs", `${id}.yaml`);
  if (!fs.existsSync(file)) return null;
  const parsed = NpcSchema.parse(readYaml(file));
  npcCache.set(id, parsed);
  return parsed;
}

export function loadAllNpcs(): Npc[] {
  const dir = path.join(CONTENT_DIR, "npcs");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => loadNpc(path.basename(f, ".yaml")))
    .filter((n): n is Npc => n !== null);
}

export function loadBackground(id: string): Background | null {
  const cached = bgCache.get(id);
  if (cached) return cached;
  const file = path.join(CONTENT_DIR, "backgrounds", `${id}.yaml`);
  if (!fs.existsSync(file)) return null;
  const parsed = BackgroundSchema.parse(readYaml(file));
  bgCache.set(id, parsed);
  return parsed;
}

export function loadAllBackgrounds(): Background[] {
  const dir = path.join(CONTENT_DIR, "backgrounds");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => loadBackground(path.basename(f, ".yaml")))
    .filter((b): b is Background => b !== null);
}
