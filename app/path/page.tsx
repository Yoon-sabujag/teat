import { loadCampaign, loadScene } from "@/lib/content/loader";
import { PathClient } from "./PathClient";

export default function PathPage() {
  const campaign = loadCampaign();
  const chapterTitles: Record<string, string> = {};
  const chapterScenes: Record<string, string[]> = {};
  const sceneTitles: Record<string, string> = {};

  for (const ch of campaign.chapters) {
    chapterTitles[ch.id] = ch.title;
    chapterScenes[ch.id] = ch.scenes;
    for (const sid of ch.scenes) {
      const scene = loadScene(sid);
      sceneTitles[sid] = scene.title ?? sid;
    }
  }

  return (
    <PathClient
      chapterOrder={campaign.chapters.map((c) => c.id)}
      chapterTitles={chapterTitles}
      chapterScenes={chapterScenes}
      sceneTitles={sceneTitles}
    />
  );
}
