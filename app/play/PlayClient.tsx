"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SceneView } from "@/components/SceneView";
import { AllocationInterstitial } from "./AllocationInterstitial";
import { useSave } from "@/lib/game-state/store";
import type { SceneEvent } from "@/lib/dialogue-engine/runner";
import type { Npc, Background } from "@/lib/content/loader";
import type { ParsedCampaign, ParsedScene } from "@/lib/dialogue-engine/schema";
import type { Stat } from "@/lib/pc/stats";

type Props = {
  campaign: ParsedCampaign;
  scenes: Record<string, ParsedScene>;
  npcs: Record<string, Npc>;
  backgrounds: Record<string, Background>;
};

export function PlayClient({ campaign, scenes, npcs, backgrounds }: Props) {
  const currentScene = useSave((s) => s.currentScene);
  const goToScene = useSave((s) => s.goToScene);
  const completeChapter = useSave((s) => s.completeChapter);
  const setPendingAllocation = useSave((s) => s.setPendingAllocation);
  const pendingAllocation = useSave((s) => s.pendingAllocation);
  const [banner, setBanner] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);


  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-neutral-950 text-neutral-500">
        불러오는 중…
      </main>
    );
  }

  if (!currentScene) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-neutral-400">
        <p>세이브가 없습니다.</p>
        <Link
          href="/"
          className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black"
        >
          타이틀로
        </Link>
      </main>
    );
  }

  const scene = scenes[currentScene];
  if (!scene) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-neutral-400">
        <p>준비 중인 씬입니다: {currentScene}</p>
        <Link
          href="/"
          className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black"
        >
          타이틀로
        </Link>
      </main>
    );
  }

  const onEvent = (event: SceneEvent) => {
    switch (event.kind) {
      case "goto":
        goToScene(event.scene);
        break;
      case "chapterComplete": {
        const chapter = campaign.chapters.find((c) => c.id === event.chapter);
        completeChapter(event.chapter, event.nextChapter);
        setBanner(`${chapter?.title ?? event.chapter} 완료`);
        // Compute allocation pool from successful skill checks in just-completed chapter.
        if (chapter) {
          const sceneIds = new Set(chapter.scenes);
          const log = useSave.getState().choiceLog;
          const successesByStat: Partial<Record<Stat, number>> = {};
          let successCount = 0;
          for (const e of log) {
            if (!sceneIds.has(e.scene)) continue;
            if (e.success === true && e.checkStat) {
              successesByStat[e.checkStat] =
                (successesByStat[e.checkStat] ?? 0) + 1;
              successCount += 1;
            }
          }
          const points = Math.floor(successCount / 3);
          if (points > 0) {
            setPendingAllocation({
              fromChapter: event.chapter,
              points,
              successesByStat,
            });
          }
        }
        if (event.nextChapter) {
          const next = campaign.chapters.find((c) => c.id === event.nextChapter);
          if (next && next.scenes[0]) {
            setTimeout(() => {
              goToScene(next.scenes[0]);
              setBanner(null);
            }, 2500);
          }
        }
        break;
      }
      case "end":
        setBanner(`엔딩: ${event.outcome}`);
        break;
      case "check":
        // Visual handled inside SceneView.
        break;
    }
  };

  if (banner) {
    return (
      <main className="relative min-h-dvh bg-neutral-950">
        <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-neutral-500">
              chapter
            </p>
            <p className="mt-3 text-3xl font-light text-neutral-100">{banner}</p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-neutral-700 px-5 py-3 text-sm text-neutral-300"
          >
            타이틀로 (세이브는 유지됩니다)
          </Link>
          <p className="max-w-xs text-center text-xs text-neutral-600">
            이후 에피소드는 추후 업데이트됩니다.
          </p>
        </div>
      </main>
    );
  }

  // After the chapter banner clears and we've auto-advanced to the next chapter's
  // first scene, the allocation interstitial takes priority over scene rendering
  // so the player commits points before the new chapter plays.
  if (pendingAllocation && pendingAllocation.points > 0) {
    const sourceChapter = campaign.chapters.find(
      (c) => c.id === pendingAllocation.fromChapter,
    );
    return (
      <AllocationInterstitial
        allocation={pendingAllocation}
        sourceChapterTitle={sourceChapter?.title ?? pendingAllocation.fromChapter}
      />
    );
  }

  return (
    <SceneView
      key={scene.id}
      scene={scene}
      npcs={npcs}
      backgrounds={backgrounds}
      onEvent={onEvent}
    />
  );
}
