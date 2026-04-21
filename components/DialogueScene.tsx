"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSceneRunner, type RunnerArgs } from "@/lib/dialogue-engine/runner";

export function DialogueScene(props: RunnerArgs) {
  const runner = useSceneRunner(props);
  const [playerInput, setPlayerInput] = useState("");

  const {
    currentLine,
    choices,
    onChoose,
    onAdvance,
    onFreeform,
    isImprovNode,
    busy,
    ending,
    primary,
    companion,
  } = runner;

  const speakerName =
    currentLine.speaker === "npc"
      ? primary.displayName
      : currentLine.speaker === "companion"
        ? companion?.displayName
        : currentLine.speaker === "player"
          ? "나"
          : "";

  return (
    <div className="flex min-h-dvh flex-col bg-black/90">
      <div className="relative flex-1">
        <Image
          src={`/characters/${primary.id}/${currentLine.expression ?? "neutral"}.webp`}
          alt={primary.displayName}
          fill
          priority
          className="object-cover"
        />
        {companion && (
          <div className="absolute bottom-0 left-0 h-28 w-28 overflow-hidden rounded-tr-2xl border-r border-t border-neutral-700">
            <Image
              src={`/characters/${companion.id}/neutral.webp`}
              alt={companion.displayName}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-800 bg-neutral-950/95 p-4">
        <div className="text-xs text-amber-400">{speakerName}</div>
        <p className="min-h-[4rem] text-sm leading-relaxed">
          {currentLine.text}
        </p>

        {ending ? (
          <Link
            href="/"
            className="rounded-xl bg-amber-500 px-4 py-3 text-center font-semibold text-black"
          >
            {ending === "success" ? "입교 성공" : "도망침"} — 돌아가기
          </Link>
        ) : choices.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {choices.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onChoose(c.id)}
                  disabled={busy}
                  className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-left text-sm disabled:opacity-50"
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        ) : isImprovNode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!playerInput.trim()) return;
              onFreeform(playerInput);
              setPlayerInput("");
            }}
            className="flex gap-2"
          >
            <input
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder="직접 말하기…"
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              전달
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onAdvance}
            className="rounded-xl border border-neutral-700 px-4 py-3 text-sm"
          >
            다음 ▶
          </button>
        )}
      </div>
    </div>
  );
}
