import { loadCampaign } from "@/lib/content/loader";
import { TitleClient } from "./TitleClient";

export default function TitlePage() {
  const campaign = loadCampaign();
  const chapterTitles: Record<string, string> = {};
  for (const ch of campaign.chapters) {
    chapterTitles[ch.id] = ch.title;
  }
  return (
    <TitleClient
      startChapter={campaign.startChapter}
      startScene={campaign.chapters[0]?.scenes[0] ?? ""}
      chapterTitles={chapterTitles}
    />
  );
}
