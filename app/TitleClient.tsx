"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSave } from "@/lib/game-state/store";

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
  const currentScene = useSave((s) => s.currentScene);
  const currentChapter = useSave((s) => s.currentChapter);
  const updatedAt = useSave((s) => s.updatedAt);
  const startNew = useSave((s) => s.startNew);
  const reset = useSave((s) => s.reset);

  useEffect(() => setHydrated(true), []);

  const hasSave = !!currentScene;
  const chapterTitle = hasSave
    ? (chapterTitles[currentChapter] ?? currentChapter)
    : null;

  const handleContinue = () => router.push("/play");

  const handleStartNew = () => {
    if (hasSave && !confirm("진행을 덮어쓰고 새로 시작하시겠습니까?")) return;
    startNew({ chapter: startChapter, scene: startScene });
    router.push("/play");
  };

  const handleReset = () => {
    if (!confirm("세이브를 완전히 지우시겠습니까?")) return;
    reset();
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
        {hydrated && hasSave && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                진행 중
              </p>
              {updatedAt > 0 && (
                <p className="text-[10px] text-neutral-600">
                  {formatTimestamp(updatedAt)}
                </p>
              )}
            </div>
            <div className="mt-2 text-base font-light text-neutral-200">
              {chapterTitle}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleContinue}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black active:scale-[0.98]"
              >
                이어서
              </button>
              <button
                type="button"
                onClick={handleStartNew}
                className="rounded-lg border border-neutral-700 px-3 py-2.5 text-xs text-neutral-400"
              >
                새로
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg px-3 py-2.5 text-xs text-neutral-600"
              >
                지우기
              </button>
            </div>
            <Link
              href="/path"
              className="mt-2 block text-right text-[11px] text-neutral-500 underline decoration-dotted underline-offset-4"
            >
              경로 보기 ▸
            </Link>
          </div>
        )}
        {hydrated && !hasSave && (
          <button
            type="button"
            onClick={handleStartNew}
            className="rounded-xl bg-amber-500 px-5 py-4 text-center font-semibold text-black active:scale-[0.98]"
          >
            새로 시작
          </button>
        )}
        {!hydrated && (
          <p className="text-center text-xs text-neutral-600">불러오는 중…</p>
        )}
      </nav>

      <footer className="text-center text-[10px] text-neutral-700">
        v0.0.1 · 개인 프로젝트
      </footer>
    </main>
  );
}
