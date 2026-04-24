"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSlots, type SlotIndex, type SlotSnapshot } from "@/lib/game-state/slots";
import type { ChoiceLogEntry } from "@/lib/game-state/store";

type Props = {
  chapterOrder: string[];
  chapterTitles: Record<string, string>;
  chapterScenes: Record<string, string[]>;
  sceneTitles: Record<string, string>;
};

export function PathClient(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-neutral-500">
          불러오는 중…
        </main>
      }
    >
      <PathView {...props} />
    </Suspense>
  );
}

function PathView({
  chapterOrder,
  chapterTitles,
  chapterScenes,
  sceneTitles,
}: Props) {
  const params = useSearchParams();
  const slotParam = params.get("slot");
  const slotIndex: SlotIndex | null =
    slotParam === "0" || slotParam === "1" || slotParam === "2"
      ? (Number(slotParam) as SlotIndex)
      : null;

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const slots = useSlots((s) => s.slots);
  const snap: SlotSnapshot | null =
    slotIndex !== null ? (slots[slotIndex] ?? null) : null;

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-neutral-500">
        불러오는 중…
      </main>
    );
  }

  if (slotIndex === null || !snap) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-neutral-400">
        <p>슬롯을 지정해 주세요.</p>
        <Link
          href="/"
          className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black"
        >
          타이틀로
        </Link>
      </main>
    );
  }

  return (
    <FlowchartView
      snap={snap}
      slotIndex={slotIndex}
      chapterOrder={chapterOrder}
      chapterTitles={chapterTitles}
      chapterScenes={chapterScenes}
      sceneTitles={sceneTitles}
    />
  );
}

type FlowProps = {
  snap: SlotSnapshot;
  slotIndex: SlotIndex;
  chapterOrder: string[];
  chapterTitles: Record<string, string>;
  chapterScenes: Record<string, string[]>;
  sceneTitles: Record<string, string>;
};

function FlowchartView({
  snap,
  slotIndex,
  chapterOrder,
  chapterTitles,
  chapterScenes,
  sceneTitles,
}: FlowProps) {
  const completed = new Set(snap.completedChapters);

  // Group log entries by scene id for fast lookup.
  const entriesByScene = useMemo(() => {
    const map = new Map<string, ChoiceLogEntry[]>();
    for (const e of snap.choiceLog ?? []) {
      const arr = map.get(e.scene) ?? [];
      arr.push(e);
      map.set(e.scene, arr);
    }
    return map;
  }, [snap.choiceLog]);

  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 text-neutral-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            경로
          </p>
          <p className="mt-1 text-lg font-light">슬롯 {slotIndex + 1}</p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400"
        >
          타이틀
        </Link>
      </div>

      <p className="mb-6 text-xs leading-relaxed text-neutral-500">
        완료한 챕터의 분기만 공개됩니다. 안 간 길은 숫자로만 남습니다.
      </p>

      <div className="flex flex-col gap-5">
        {chapterOrder.map((chId) => {
          const title = chapterTitles[chId] ?? chId;
          const isDone = completed.has(chId);
          const isCurrent = snap.currentChapter === chId && !isDone;
          const scenes = chapterScenes[chId] ?? [];
          const totalEntriesInChapter = scenes.reduce(
            (n, sid) => n + (entriesByScene.get(sid)?.length ?? 0),
            0,
          );

          return (
            <section
              key={chId}
              className={`rounded-xl border p-4 ${
                isDone
                  ? "border-neutral-800 bg-neutral-950/50"
                  : isCurrent
                    ? "border-amber-700/40 bg-amber-900/5"
                    : "border-neutral-900 bg-neutral-950/30"
              }`}
            >
              <header className="flex items-center justify-between">
                <div className="text-sm font-light text-neutral-200">
                  {title}
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  {isDone
                    ? "완료"
                    : isCurrent
                      ? "진행 중"
                      : "잠김"}
                </div>
              </header>

              {isDone || isCurrent ? (
                <div className="mt-3 flex flex-col gap-3">
                  {scenes.map((sid) => {
                    const entries = entriesByScene.get(sid) ?? [];
                    if (entries.length === 0) {
                      // Scene not yet reached in this slot — show a locked row.
                      if (isCurrent) return null; // hide unreached within current chapter
                      return (
                        <SceneRow
                          key={sid}
                          title={sceneTitles[sid] ?? sid}
                          entries={[]}
                          locked
                        />
                      );
                    }
                    return (
                      <SceneRow
                        key={sid}
                        title={sceneTitles[sid] ?? sid}
                        entries={entries}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 text-xs text-neutral-600">
                  이 챕터는 아직 열리지 않았다.
                </div>
              )}

              {isCurrent && totalEntriesInChapter === 0 && (
                <div className="mt-3 text-xs text-neutral-600">
                  아직 선택을 내리지 않았다.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function SceneRow({
  title,
  entries,
  locked = false,
}: {
  title: string;
  entries: ChoiceLogEntry[];
  locked?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
      <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </div>
      {locked ? (
        <div className="text-xs text-neutral-700">? 지나지 않음</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((e, i) => (
            <li key={`${e.scene}-${i}`} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 flex-none rounded-full bg-amber-400" />
              <div className="flex-1 text-sm text-neutral-200">
                <div>
                  {e.choiceLabel}
                  {typeof e.success === "boolean" && (
                    <span
                      className={`ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                        e.success
                          ? "bg-emerald-900/50 text-emerald-300"
                          : "bg-rose-900/50 text-rose-300"
                      }`}
                    >
                      {e.success ? "성공" : "실패"}
                    </span>
                  )}
                </div>
                {e.alternativeCount > 0 && (
                  <div className="mt-0.5 flex gap-1 text-[11px] text-neutral-600">
                    {Array.from({ length: e.alternativeCount }).map((_, k) => (
                      <span
                        key={k}
                        className="rounded border border-neutral-800 bg-neutral-900/80 px-1.5 py-0.5"
                      >
                        ?
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
