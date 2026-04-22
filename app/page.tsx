"use client";

import Link from "next/link";
import { useSave } from "@/lib/game-state/store";

export default function TitlePage() {
  const hasSave =
    useSave((s) => !!s.currentScene) ?? false;
  const startNew = useSave((s) => s.startNew);
  const reset = useSave((s) => s.reset);

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
        {hasSave && (
          <Link
            href="/play"
            className="rounded-xl bg-amber-500 px-5 py-4 text-center font-semibold text-black active:scale-[0.98]"
          >
            이어서 하기
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            startNew({ chapter: "prologue", scene: "prologue-exec-room" });
            location.href = "/play";
          }}
          className={`rounded-xl px-5 py-4 text-center font-semibold active:scale-[0.98] ${
            hasSave
              ? "border border-neutral-700"
              : "bg-amber-500 text-black"
          }`}
        >
          {hasSave ? "새로 시작 (세이브 덮어쓰기)" : "새로 시작"}
        </button>
        {hasSave && (
          <button
            type="button"
            onClick={() => {
              if (confirm("세이브를 완전히 지우시겠습니까?")) reset();
            }}
            className="rounded-xl px-5 py-3 text-center text-sm text-neutral-500"
          >
            세이브 초기화
          </button>
        )}
      </nav>

      <footer className="text-center text-[10px] text-neutral-700">
        v0.0.1 · 개인 프로젝트
      </footer>
    </main>
  );
}
