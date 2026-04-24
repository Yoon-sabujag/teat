"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSave } from "@/lib/game-state/store";
import { useSlots, type SlotIndex, type SlotSnapshot } from "@/lib/game-state/slots";

type Props = {
  startChapter: string;
  startScene: string;
  chapterTitles: Record<string, string>;
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${min}`;
}

export function TitleClient({ startChapter, startScene, chapterTitles }: Props) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const slots = useSlots((s) => s.slots);
  const setActiveSlot = useSlots((s) => s.setActiveSlot);
  const writeToSlot = useSlots((s) => s.writeToSlot);
  const clearSlot = useSlots((s) => s.clearSlot);
  const startNew = useSave((s) => s.startNew);
  const loadSnapshot = useSave((s) => s.loadSnapshot);

  useEffect(() => {
    setHydrated(true);
    // One-time migration: if the legacy single-save has progress but no slot
    // has been populated yet, seed slot 0 with the active state.
    const slotsState = useSlots.getState();
    const saveState = useSave.getState();
    const anyFilled = slotsState.slots.some((s) => s !== null);
    if (!anyFilled && saveState.currentScene) {
      writeToSlot(0, {
        pc: saveState.pc,
        currentChapter: saveState.currentChapter,
        currentScene: saveState.currentScene,
        history: saveState.history,
        completedChapters: saveState.completedChapters,
        choiceLog: saveState.choiceLog ?? [],
        updatedAt: Date.now(),
      });
    }
  }, [writeToSlot]);

  const handleContinue = (i: SlotIndex, snap: SlotSnapshot) => {
    loadSnapshot({
      pc: snap.pc,
      currentChapter: snap.currentChapter,
      currentScene: snap.currentScene,
      history: snap.history,
      completedChapters: snap.completedChapters,
      choiceLog: snap.choiceLog ?? [],
    });
    setActiveSlot(i);
    router.push("/play");
  };

  const handleStartNew = (i: SlotIndex, overwrite: boolean) => {
    if (overwrite && !confirm(`슬롯 ${i + 1}의 진행을 덮어쓰고 새로 시작하시겠습니까?`)) {
      return;
    }
    startNew({ chapter: startChapter, scene: startScene });
    setActiveSlot(i);
    // Seed the slot immediately so the title page reflects the new game on back-nav.
    writeToSlot(i, {
      pc: useSave.getState().pc,
      currentChapter: startChapter,
      currentScene: startScene,
      history: [startScene],
      completedChapters: [],
      choiceLog: [],
      updatedAt: Date.now(),
    });
    router.push("/play");
  };

  const handleClear = (i: SlotIndex) => {
    if (!confirm(`슬롯 ${i + 1}을 지우시겠습니까?`)) return;
    clearSlot(i);
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-10 p-6 text-neutral-100">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-neutral-500">
          대화 CRPG
        </p>
        <h1 className="mt-4 text-5xl font-light leading-tight tracking-tight">
          을지로
          <span className="mx-2 text-neutral-600">·</span>
          7층
        </h1>
        <p className="mt-6 text-sm text-neutral-400">
          해고된 46세 남자, 첫 의뢰는 재벌 3세의 실종.
        </p>
      </header>

      <nav className="flex w-full flex-col gap-3">
        {hydrated ? (
          ([0, 1, 2] as SlotIndex[]).map((i) => {
            const snap = slots[i];
            const filled = snap !== null;
            const chapterTitle = filled
              ? chapterTitles[snap.currentChapter] ?? snap.currentChapter
              : null;
            return (
              <div
                key={i}
                className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                    슬롯 {i + 1}
                  </p>
                  {filled && (
                    <p className="text-[10px] text-neutral-600">
                      {formatTimestamp(snap.updatedAt)}
                    </p>
                  )}
                </div>
                <div className="mt-2 min-h-[1.75rem] text-base font-light">
                  {filled ? (
                    <span className="text-neutral-200">{chapterTitle}</span>
                  ) : (
                    <span className="text-neutral-600">비어 있음</span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {filled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleContinue(i, snap)}
                        className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black active:scale-[0.98]"
                      >
                        이어서
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartNew(i, true)}
                        className="rounded-lg border border-neutral-700 px-3 py-2.5 text-xs text-neutral-400"
                      >
                        새로
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClear(i)}
                        className="rounded-lg px-3 py-2.5 text-xs text-neutral-600"
                      >
                        지우기
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartNew(i, false)}
                      className="flex-1 rounded-lg border border-amber-500/60 px-4 py-2.5 text-sm font-semibold text-amber-400 active:scale-[0.98]"
                    >
                      새로 시작
                    </button>
                  )}
                </div>
                {filled && (
                  <Link
                    href={`/path?slot=${i}`}
                    className="mt-2 block text-right text-[11px] text-neutral-500 underline decoration-dotted underline-offset-4"
                  >
                    경로 보기 ▸
                  </Link>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-xs text-neutral-600">불러오는 중…</p>
        )}
      </nav>

      <footer className="text-center text-[10px] text-neutral-700">
        v0.0.1 · 개인 프로젝트
      </footer>
    </main>
  );
}
