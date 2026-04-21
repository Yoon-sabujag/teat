"use client";

import Link from "next/link";
import { useGameStore } from "@/lib/game-state/store";

export default function CongregationPage() {
  const followers = useGameStore((s) => s.followers);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">신도 명부</h1>
      {Object.values(followers).length === 0 ? (
        <p className="text-sm text-neutral-400">
          아직 입단한 신도가 없습니다. 길거리로 나가 전도하세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {Object.values(followers).map((f) => (
            <li
              key={f.npcId}
              className="rounded-xl border border-neutral-800 p-4"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{f.displayName}</span>
                <span className="text-xs text-neutral-400">
                  맹신도 {f.faith}
                </span>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                입교 대상: {f.pendingTargets.length}명
              </div>
              {f.pendingTargets.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1">
                  {f.pendingTargets.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/coop/${f.npcId}/${t.id}`}
                        className="text-sm text-amber-400"
                      >
                        → {t.displayName} ({t.relation}) 협공 설교
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
