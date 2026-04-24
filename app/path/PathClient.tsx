"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSave } from "@/lib/game-state/store";
import type {
  ChoiceAlternative,
  ChoiceLogEntry,
  RewindSnapshot,
} from "@/lib/game-state/store";
import {
  routeTrackers,
  summarizeChapterRoute,
  type RouteTone,
} from "@/lib/game-state/routes";
import { STAT_LABELS } from "@/lib/pc/stats";

type Props = {
  chapterOrder: string[];
  chapterTitles: Record<string, string>;
  chapterScenes: Record<string, string[]>;
  sceneTitles: Record<string, string>;
};

export function PathClient({
  chapterOrder,
  chapterTitles,
  chapterScenes,
  sceneTitles,
}: Props) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const choiceLog = useSave((s) => s.choiceLog);
  const currentChapter = useSave((s) => s.currentChapter);
  const completedChapters = useSave((s) => s.completedChapters);
  const currentScene = useSave((s) => s.currentScene);
  const flags = useSave((s) => s.pc.flags);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-neutral-500">
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

  return (
    <FlowchartView
      choiceLog={choiceLog}
      currentChapter={currentChapter}
      completedChapters={completedChapters}
      chapterOrder={chapterOrder}
      chapterTitles={chapterTitles}
      chapterScenes={chapterScenes}
      sceneTitles={sceneTitles}
      flags={flags}
    />
  );
}

type FlowProps = {
  choiceLog: ChoiceLogEntry[];
  currentChapter: string;
  completedChapters: string[];
  chapterOrder: string[];
  chapterTitles: Record<string, string>;
  chapterScenes: Record<string, string[]>;
  sceneTitles: Record<string, string>;
  flags: Record<string, boolean | string | number>;
};

const TONE_CLASS: Record<RouteTone, string> = {
  warm: "text-amber-300",
  cold: "text-sky-300",
  tense: "text-rose-300",
  dim: "text-neutral-500",
  neutral: "text-neutral-300",
};

function FlowchartView({
  choiceLog,
  currentChapter,
  completedChapters,
  chapterOrder,
  chapterTitles,
  chapterScenes,
  sceneTitles,
  flags,
}: FlowProps) {
  const trackers = useMemo(() => routeTrackers(flags), [flags]);
  const completed = new Set(completedChapters);

  // Pair each log entry with its absolute index (for rewind truncation).
  type Indexed = { entry: ChoiceLogEntry; index: number };
  const indexed: Indexed[] = useMemo(
    () => choiceLog.map((entry, index) => ({ entry, index })),
    [choiceLog],
  );

  const entriesByScene = useMemo(() => {
    const map = new Map<string, Indexed[]>();
    for (const it of indexed) {
      const arr = map.get(it.entry.scene) ?? [];
      arr.push(it);
      map.set(it.entry.scene, arr);
    }
    return map;
  }, [indexed]);

  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 text-neutral-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            경로
          </p>
          <p className="mt-1 text-lg font-light">내가 지나온 길</p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400"
        >
          타이틀
        </Link>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-neutral-500">
        각 결정점의 선택지는 그 시점에 이미 보였던 카드. 안 고른 카드의{" "}
        <em className="not-italic text-neutral-400">이후</em>는 숨깁니다. 카드 끝의
        <span className="mx-1 rounded border border-neutral-800 bg-neutral-900/80 px-1 py-0.5 font-mono text-[9px] text-neutral-400">
          ↺
        </span>
        버튼으로 그 시점부터 다시 플레이.
      </p>

      {trackers.length > 0 && (
        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            지금 기울어져 있는 방향
          </div>
          <ul className="flex flex-col gap-1.5">
            {trackers.map((t, i) => (
              <li key={i} className="flex items-baseline gap-3 text-sm">
                <span className="w-16 flex-none text-[11px] uppercase tracking-[0.15em] text-neutral-500">
                  {t.label}
                </span>
                <span className={`flex-1 leading-snug ${TONE_CLASS[t.tone]}`}>
                  {t.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {chapterOrder.map((chId) => {
          const title = chapterTitles[chId] ?? chId;
          const isDone = completed.has(chId);
          const isCurrent = currentChapter === chId && !isDone;
          const scenes = chapterScenes[chId] ?? [];

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
                  {isDone ? "완료" : isCurrent ? "진행 중" : "잠김"}
                </div>
              </header>

              {(() => {
                if (!(isDone || isCurrent)) return null;
                const summary = summarizeChapterRoute(chId, flags);
                if (!summary) return null;
                return (
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                      결
                    </span>
                    <span
                      className={`text-xs leading-snug ${TONE_CLASS[summary.tone]}`}
                    >
                      {summary.text}
                    </span>
                  </div>
                );
              })()}

              {isDone || isCurrent ? (
                <div className="mt-3 flex flex-col gap-3">
                  {scenes.map((sid) => {
                    const items = entriesByScene.get(sid) ?? [];
                    if (items.length === 0) {
                      if (isCurrent) return null;
                      return (
                        <SceneRow
                          key={sid}
                          title={sceneTitles[sid] ?? sid}
                          items={[]}
                          locked
                        />
                      );
                    }
                    return (
                      <SceneRow
                        key={sid}
                        title={sceneTitles[sid] ?? sid}
                        items={items}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 text-xs text-neutral-600">
                  이 챕터는 아직 열리지 않았다.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}

type Indexed = { entry: ChoiceLogEntry; index: number };

function SceneRow({
  title,
  items,
  locked = false,
}: {
  title: string;
  items: Indexed[];
  locked?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-black/30 p-3">
      <div className="mb-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </div>
      {locked ? (
        <div className="text-xs text-neutral-700">? 지나지 않음</div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <DecisionPoint key={`${it.entry.scene}-${it.index}`} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckBadge({
  stat,
  dc,
  faded = false,
}: {
  stat: string;
  dc?: number;
  faded?: boolean;
}) {
  return (
    <span
      className={`mr-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
        faded
          ? "bg-neutral-800/60 text-neutral-500"
          : "bg-amber-900/40 text-amber-300"
      }`}
    >
      {STAT_LABELS[stat as keyof typeof STAT_LABELS] ?? stat}
      {typeof dc === "number" && dc > 0 ? ` DC${dc}` : ""}
    </span>
  );
}

function DecisionPoint({ item }: { item: Indexed }) {
  const entry = item.entry;
  const hasLabels = Array.isArray(entry.alternatives);
  const canRewind = !!entry.rewind;

  return (
    <div className="relative">
      {/* Picked branch */}
      <div className="flex items-start gap-2">
        <span className="mt-1.5 inline-block h-2 w-2 flex-none rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(217,119,6,0.18)]" />
        <div className="flex-1">
          <div className="flex items-baseline gap-2 text-sm text-neutral-100">
            {entry.checkStat && (
              <CheckBadge stat={entry.checkStat} dc={entry.checkDc} />
            )}
            <span className="flex-1 leading-snug">{entry.choiceLabel}</span>
            {typeof entry.success === "boolean" && (
              <span
                className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                  entry.success
                    ? "bg-emerald-900/50 text-emerald-300"
                    : "bg-rose-900/50 text-rose-300"
                }`}
              >
                {entry.success ? "성공" : "실패"}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.15em] text-amber-500">
              선택
            </span>
            {canRewind && (
              <RewindButton
                beforeIndex={item.index}
                rewind={entry.rewind!}
              />
            )}
          </div>
        </div>
      </div>

      {/* Alternative branches */}
      {hasLabels ? (
        (entry.alternatives ?? []).length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5 border-l border-dashed border-neutral-800 pl-4">
            {(entry.alternatives ?? []).map((alt) => (
              <AlternativeRow key={alt.id} alt={alt} />
            ))}
          </ul>
        )
      ) : entry.alternativeCount > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 pl-4 text-[11px] text-neutral-600">
          {Array.from({ length: entry.alternativeCount }).map((_, k) => (
            <span
              key={k}
              className="rounded border border-neutral-800 bg-neutral-900/80 px-1.5 py-0.5"
            >
              ?
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AlternativeRow({ alt }: { alt: ChoiceAlternative }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full border border-neutral-700 bg-neutral-900" />
      <div className="flex flex-1 items-baseline gap-2 text-sm text-neutral-500">
        {alt.check && (
          <CheckBadge stat={alt.check.stat} dc={alt.check.dc} faded />
        )}
        <span className="flex-1 leading-snug">{alt.label}</span>
        <span className="font-mono text-[10px] text-neutral-700">↳ ?</span>
      </div>
    </li>
  );
}

function RewindButton({
  beforeIndex,
  rewind,
}: {
  beforeIndex: number;
  rewind: RewindSnapshot;
}) {
  const router = useRouter();
  const rewindAction = useSave((s) => s.rewindToDecision);

  const onClick = () => {
    if (
      !confirm(
        "이 지점부터 다시 플레이하시겠습니까? 이후 진행은 지워지고 여기서부터 다시 시작합니다.",
      )
    )
      return;
    rewindAction(beforeIndex, rewind);
    router.push("/play");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-neutral-700 bg-neutral-900/70 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 hover:border-amber-500/60 hover:text-amber-300"
      title="이 결정점부터 다시"
    >
      ↺ 여기부터 다시
    </button>
  );
}
