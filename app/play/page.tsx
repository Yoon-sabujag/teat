import { PlayClient } from "./PlayClient";
import {
  loadCampaign,
  loadAllNpcs,
  loadAllBackgrounds,
} from "@/lib/content/loader";
import { loadScene } from "@/lib/content/loader";
import type { ParsedScene } from "@/lib/dialogue-engine/schema";

export default function PlayPage() {
  const campaign = loadCampaign();
  const npcs = Object.fromEntries(loadAllNpcs().map((n) => [n.id, n]));
  const backgrounds = Object.fromEntries(
    loadAllBackgrounds().map((b) => [b.id, b]),
  );

  const scenes: Record<string, ParsedScene> = {};
  for (const ch of campaign.chapters) {
    for (const id of ch.scenes) {
      scenes[id] = loadScene(id);
    }
  }

  return (
    <PlayClient
      campaign={campaign}
      scenes={scenes}
      npcs={npcs}
      backgrounds={backgrounds}
    />
  );
}
