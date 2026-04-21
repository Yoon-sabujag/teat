import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { ScriptSchema } from "./schema";
import type { Script } from "./types";

const SCRIPT_DIR = path.join(process.cwd(), "content", "scripts");

const cache = new Map<string, Script>();

export function loadScript(id: string): Script {
  const cached = cache.get(id);
  if (cached) return cached;

  const file = path.join(SCRIPT_DIR, `${id}.yaml`);
  const raw = fs.readFileSync(file, "utf8");
  const parsed = ScriptSchema.parse(yaml.load(raw));

  cache.set(id, parsed);
  return parsed;
}
