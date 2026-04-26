"use client";

import { useMemo, useState } from "react";
import { STAT_LABELS, type Stat } from "@/lib/pc/stats";
import { useSave, type PendingAllocation } from "@/lib/game-state/store";

const STAT_ORDER: Stat[] = [
  "gwonmo",
  "beopri",
  "jikgam",
  "ttuksim",
  "inmaek",
  "yangsim",
];

type Props = {
  allocation: PendingAllocation;
  sourceChapterTitle: string;
};

/**
 * Stat allocation screen. Two modes:
 *   - chapter-end: +1 per stat max, recommendation by successes in source chapter
 *   - initial (isInitial=true): +2 per stat max, no recommendation, equal listing
 */
export function AllocationInterstitial({
  allocation,
  sourceChapterTitle,
}: Props) {
  const stats = useSave((s) => s.pc.stats);
  const applyAllocation = useSave((s) => s.applyAllocation);

  const isInitial = !!allocation.isInitial;
  const maxPerStat = isInitial ? 2 : 1;

  const [picks, setPicks] = useState<Partial<Record<Stat, number>>>({});
  const spent = Object.values(picks).reduce<number>((n, v) => n + (v ?? 0), 0);
  const remaining = allocation.points - spent;

  // Sort stats by the player's successes in the source chapter (chapter-end
  // mode), or in canonical order (initial mode).
  const ranked = useMemo(() => {
    if (isInitial) return [...STAT_ORDER];
    const successes = allocation.successesByStat;
    return [...STAT_ORDER].sort(
      (a, b) => (successes[b] ?? 0) - (successes[a] ?? 0),
    );
  }, [allocation.successesByStat, isInitial]);

  const topTwo = new Set(
    isInitial
      ? []
      : ranked.slice(0, 2).filter((s) => (allocation.successesByStat[s] ?? 0) > 0),
  );

  const togglePick = (stat: Stat) => {
    const current = picks[stat] ?? 0;
    const statValue = stats[stat];
    // Cycle: 0 → 1 → ... → maxPerStat → 0
    if (current >= maxPerStat) {
      const next = { ...picks };
      delete next[stat];
      setPicks(next);
      return;
    }
    if (remaining <= 0) return;
    if (statValue + (current + 1) > 6) return; // cap
    setPicks({ ...picks, [stat]: current + 1 });
  };

  const commit = () => {
    applyAllocation(picks);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between p-6 text-neutral-100">
      <header className="mt-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-500">
          {isInitial ? "백승재 — 46세" : `${sourceChapterTitle} 이후`}
        </p>
        <h1 className="mt-3 text-2xl font-light leading-snug">
          {isInitial
            ? "어디에 강한 사람으로 들어가실지."
            : "지난 장에서 통한 감이 한 뼘 돌아왔다."}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-400">
          남은 포인트{" "}
          <span className="font-mono text-amber-300">{remaining}</span> /{" "}
          <span className="font-mono text-neutral-500">{allocation.points}</span>
          . {isInitial
            ? "한 스탯당 최대 +2 (다시 누르면 단계 조정). 6 이상은 올라가지 않음."
            : "어디에 얹어 두실지 고르세요. 한 스탯당 최대 +1."}
        </p>
      </header>

      <ul className="flex flex-col gap-2 py-6">
        {ranked.map((stat) => {
          const picked = (picks[stat] ?? 0) > 0;
          const current = stats[stat];
          const capped = current >= 6;
          const successes = allocation.successesByStat[stat] ?? 0;
          const recommended = topTwo.has(stat);
          return (
            <li key={stat}>
              <button
                type="button"
                disabled={capped || (remaining <= 0 && !picked)}
                onClick={() => togglePick(stat)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition disabled:opacity-40 ${
                  picked
                    ? "border-amber-400 bg-amber-500/15"
                    : recommended
                      ? "border-amber-700/50 bg-amber-900/10"
                      : "border-neutral-800 bg-neutral-950/50"
                }`}
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-light text-neutral-100">
                      {STAT_LABELS[stat]}
                    </span>
                    {recommended && (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-amber-400">
                        지난 장에 통함
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {isInitial
                      ? capped
                        ? "상한(6)"
                        : "기본 2"
                      : successes > 0
                        ? `성공 ${successes}회`
                        : "성공 없음"}
                    {!isInitial && capped && " · 상한(6)"}
                  </div>
                </div>
                <div className="flex items-baseline gap-1 font-mono text-sm">
                  <span className="text-neutral-300">{current}</span>
                  {(picks[stat] ?? 0) > 0 && (
                    <span className="text-amber-300">
                      → {Math.min(6, current + (picks[stat] ?? 0))}
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-col gap-3">
        <button
          type="button"
          onClick={commit}
          disabled={remaining < 0}
          className="rounded-xl bg-amber-500 px-5 py-4 text-center text-sm font-semibold text-black active:scale-[0.98] disabled:opacity-50"
        >
          {spent === 0
            ? "얹지 않고 다음 장으로"
            : `확정 (+${spent}점 배분)`}
        </button>
        <p className="text-center text-[10px] text-neutral-600">
          남은 포인트는 다음 장으로 넘기지 않습니다.
        </p>
      </footer>
    </main>
  );
}
