"use client";

import { useState } from "react";
import Image from "next/image";
import { useSceneRunner, type SceneEvent } from "@/lib/dialogue-engine/runner";
import { STAT_LABELS } from "@/lib/pc/stats";
import { useSave } from "@/lib/game-state/store";
import type { Npc, Background } from "@/lib/content/loader";
import type { Scene, CastMember, Line, Choice } from "@/lib/dialogue-engine/types";
import type { CheckResult } from "@/lib/pc/stats";
import type { PcState } from "@/lib/game-state/store";

type Props = {
  scene: Scene;
  npcs: Record<string, Npc>;
  backgrounds: Record<string, Background>;
  onEvent: (event: SceneEvent) => void;
};

const POSITION_CLASS = {
  left: "left-0 w-1/2",
  center: "left-1/4 w-1/2",
  right: "right-0 w-1/2",
  offscreen: "hidden",
};

export function SceneView({ scene, npcs, backgrounds, onEvent }: Props) {
  const runner = useSceneRunner({ scene, onEvent });
  const [playerInput, setPlayerInput] = useState("");
  const [hud, setHud] = useState<null | "stats" | "memory">(null);
  const pc = useSave((s) => s.pc);

  const {
    background,
    cast,
    mode,
    currentLine,
    visibleLinesSoFar,
    choices,
    advance,
    runChoice,
    runImprov,
    isImprovNode,
    suggestions,
    busy,
    lastCheck,
    improvError,
    dismissImprovError,
    canRetryImprov,
    retryImprov,
  } = runner;

  if (mode === "kakao") {
    return (
      <KakaoView
        npcs={npcs}
        visibleLines={visibleLinesSoFar}
        currentLine={currentLine}
        choices={choices}
        advance={advance}
        runChoice={runChoice}
        busy={busy}
        lastCheck={lastCheck}
        hudState={hud}
        setHud={setHud}
        pc={pc}
      />
    );
  }

  const bg = backgrounds[background];
  const speakerNpc =
    currentLine.speaker === "pc" ||
    currentLine.speaker === "narration" ||
    currentLine.speaker === "thought"
      ? null
      : npcs[currentLine.speaker] ?? null;
  const speakerName =
    currentLine.speaker === "narration"
      ? ""
      : currentLine.speaker === "pc"
        ? pc.name
        : currentLine.speaker === "thought"
          ? `${pc.name} (속)`
          : (speakerNpc?.displayName ?? currentLine.speaker);

  return (
    <div className="relative flex min-h-dvh flex-col bg-neutral-950 text-neutral-100">
      <div className="relative flex-1 overflow-hidden">
        {bg ? (
          <Image
            src={`/backgrounds/${bg.file}`}
            alt={bg.displayName}
            fill
            priority
            className="object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {cast.map((member: CastMember) => {
          const npc = npcs[member.npc];
          if (!npc || member.position === "offscreen") return null;
          const dimmed =
            currentLine.speaker !== member.npc &&
            currentLine.speaker !== "narration";
          return (
            <div
              key={member.npc}
              className={`absolute bottom-0 ${POSITION_CLASS[member.position]} flex items-end justify-center transition-opacity`}
              style={{ opacity: dimmed ? 0.55 : 1 }}
            >
              <div className="relative h-[70dvh] w-full">
                <Image
                  src={`/characters/${member.npc}/${member.expression ?? "neutral"}.webp`}
                  alt={npc.displayName}
                  fill
                  priority
                  className="object-contain object-bottom"
                />
              </div>
            </div>
          );
        })}

        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => setHud((v) => (v === "stats" ? null : "stats"))}
            className={`rounded-full border px-3 py-1 text-xs backdrop-blur ${
              hud === "stats"
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-neutral-600 bg-black/60"
            }`}
          >
            스탯
          </button>
          <button
            type="button"
            onClick={() => setHud((v) => (v === "memory" ? null : "memory"))}
            className={`rounded-full border px-3 py-1 text-xs backdrop-blur ${
              hud === "memory"
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-neutral-600 bg-black/60"
            }`}
          >
            기억 {pc.memory.length > 0 && `(${pc.memory.length})`}
          </button>
        </div>

        {hud === "stats" && (
          <div className="absolute right-3 top-12 w-56 rounded-xl border border-neutral-700 bg-neutral-950/90 p-3 text-xs backdrop-blur">
            <div className="mb-2 text-neutral-400">{pc.name}</div>
            <ul className="space-y-1">
              {Object.entries(pc.stats).map(([stat, value]) => (
                <li key={stat} className="flex justify-between">
                  <span>{STAT_LABELS[stat as keyof typeof STAT_LABELS]}</span>
                  <span className="font-mono text-amber-300">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hud === "memory" && (
          <div className="absolute right-3 top-12 max-h-[60dvh] w-72 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950/95 p-3 text-xs backdrop-blur">
            <div className="mb-2 text-neutral-400">지금까지 알아낸 것</div>
            {pc.memory.length === 0 ? (
              <p className="text-neutral-600">아직 기억할 것이 없다.</p>
            ) : (
              <ul className="space-y-2">
                {[...pc.memory].reverse().map((m, i) => (
                  <li
                    key={`${i}-${m.slice(0, 8)}`}
                    className="border-l-2 border-neutral-700 pl-2 leading-relaxed text-neutral-300"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {lastCheck && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 rounded-full border border-amber-400/60 bg-black/80 px-4 py-1 text-xs font-mono backdrop-blur">
            {STAT_LABELS[lastCheck.stat as keyof typeof STAT_LABELS]} d20={lastCheck.roll} + {lastCheck.statValue} = {lastCheck.total} vs {lastCheck.dc}{" "}
            <span
              className={lastCheck.success ? "text-emerald-400" : "text-rose-400"}
            >
              {lastCheck.success ? "성공" : "실패"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-800 bg-neutral-950/95 p-4">
        {speakerName && (
          <div className="text-xs uppercase tracking-wide text-amber-400">
            {speakerName}
          </div>
        )}
        <p
          className={`min-h-[4.5rem] text-sm leading-relaxed ${
            currentLine.speaker === "narration"
              ? "italic text-neutral-400"
              : currentLine.speaker === "thought"
                ? "text-neutral-500"
                : "text-neutral-100"
          }`}
        >
          {busy && isImprovNode ? (
            <span className="inline-flex items-center gap-2 text-neutral-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              응답 받는 중…
            </span>
          ) : (
            currentLine.text
          )}
        </p>

        {improvError && (
          <div className="flex flex-col gap-2 rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs text-rose-200">
            <div>오류: {improvError}</div>
            <div className="flex gap-2">
              {canRetryImprov && (
                <button
                  type="button"
                  onClick={retryImprov}
                  disabled={busy}
                  className="rounded-md bg-rose-900/70 px-3 py-1 text-[11px] font-semibold text-rose-100 disabled:opacity-50"
                >
                  다시 시도
                </button>
              )}
              <button
                type="button"
                onClick={dismissImprovError}
                className="text-rose-300 underline"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {choices.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {choices.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => runChoice(c)}
                  disabled={busy}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-left text-sm disabled:opacity-50 active:bg-neutral-800"
                >
                  {c.check && (
                    <span className="mr-2 rounded-md bg-amber-900/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                      {STAT_LABELS[c.check.stat]} DC{c.check.dc}
                    </span>
                  )}
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        ) : isImprovNode ? (
          <div className="flex flex-col gap-3">
            {suggestions.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                  물어볼 거리
                </div>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={busy}
                      onClick={() => runImprov(s)}
                      className="w-full rounded-xl border border-amber-700/60 bg-amber-900/10 px-4 py-3 text-left text-sm text-amber-100 transition disabled:opacity-40 active:scale-[0.98] active:bg-amber-900/30"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!playerInput.trim() || busy) return;
                runImprov(playerInput);
                setPlayerInput("");
              }}
              className="flex gap-2"
            >
              <input
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                placeholder="자유롭게 말하기…"
                disabled={busy}
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !playerInput.trim()}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busy ? "…" : "전달"}
              </button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={advance}
            className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm active:bg-neutral-800"
          >
            다음 ▶
          </button>
        )}
      </div>
    </div>
  );
}

type KakaoProps = {
  npcs: Record<string, Npc>;
  visibleLines: Line[];
  currentLine: Line;
  choices: Choice[];
  advance: () => void;
  runChoice: (choice: Choice) => void;
  busy: boolean;
  lastCheck: CheckResult | null;
  hudState: null | "stats" | "memory";
  setHud: (v: null | "stats" | "memory") => void;
  pc: PcState;
};

// Matches "오후 11:47", "10:04" — short time markers that read as kakao's
// subtle date separators.
const TIMESTAMP_RE = /^(오후|오전|\d{1,2}:\d{2})/;
function isTimestampNarration(line: Line): boolean {
  return line.speaker === "narration" && TIMESTAMP_RE.test(line.text.trim());
}
// Author-voice prose describing the scene from outside — does NOT belong
// inside the phone frame. Renders externally, like thought.
function isProseNarration(line: Line): boolean {
  return line.speaker === "narration" && !TIMESTAMP_RE.test(line.text.trim());
}

function KakaoView({
  npcs,
  visibleLines,
  currentLine,
  choices,
  advance,
  runChoice,
  busy,
  lastCheck,
  hudState,
  setHud,
  pc,
}: KakaoProps) {
  // Chat-body lines: bubble speakers (pc + NPCs), `system` (kakao system
  // notifications like "나갔습니다"), and narration that's a timestamp.
  // Prose narration and thought render OUTSIDE the phone, near the bottom.
  const bubbleLines = visibleLines.filter(
    (l) => l.speaker !== "thought" && !isProseNarration(l),
  );
  const externalLine: Line | null =
    currentLine.speaker === "thought" || isProseNarration(currentLine)
      ? currentLine
      : null;
  // Find the primary non-PC speaker for the header label.
  const otherSpeakerId = visibleLines
    .map((l) => l.speaker)
    .find(
      (s) =>
        s !== "pc" &&
        s !== "narration" &&
        s !== "thought" &&
        s !== "system",
    );
  const otherName = otherSpeakerId
    ? (npcs[otherSpeakerId]?.displayName ?? otherSpeakerId)
    : "대화";

  return (
    <div className="relative flex min-h-dvh flex-col bg-neutral-900 text-neutral-100">
      {/* Phone header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold">
            {otherName.slice(0, 1)}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
              카카오톡
            </div>
            <div className="text-sm font-light text-neutral-100">
              {otherName}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHud(hudState === "stats" ? null : "stats")}
            className={`rounded-full border px-3 py-1 text-xs ${
              hudState === "stats"
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-neutral-700 bg-black/40"
            }`}
          >
            스탯
          </button>
          <button
            type="button"
            onClick={() => setHud(hudState === "memory" ? null : "memory")}
            className={`rounded-full border px-3 py-1 text-xs ${
              hudState === "memory"
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-neutral-700 bg-black/40"
            }`}
          >
            기억 {pc.memory.length > 0 && `(${pc.memory.length})`}
          </button>
        </div>
      </div>

      {/* HUD overlays — reuse compact panels */}
      {hudState === "stats" && (
        <div className="absolute right-3 top-16 z-10 w-56 rounded-xl border border-neutral-700 bg-neutral-950/95 p-3 text-xs">
          <div className="mb-2 text-neutral-400">{pc.name}</div>
          <ul className="space-y-1">
            {Object.entries(pc.stats).map(([stat, value]) => (
              <li key={stat} className="flex justify-between">
                <span>{STAT_LABELS[stat as keyof typeof STAT_LABELS]}</span>
                <span className="font-mono text-amber-300">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hudState === "memory" && (
        <div className="absolute right-3 top-16 z-10 max-h-[60dvh] w-72 overflow-y-auto rounded-xl border border-neutral-700 bg-neutral-950/95 p-3 text-xs">
          <div className="mb-2 text-neutral-400">지금까지 알아낸 것</div>
          {pc.memory.length === 0 ? (
            <p className="text-neutral-600">아직 기억할 것이 없다.</p>
          ) : (
            <ul className="space-y-2">
              {[...pc.memory].reverse().map((m, i) => (
                <li
                  key={`${i}-${m.slice(0, 8)}`}
                  className="border-l-2 border-neutral-700 pl-2 leading-relaxed text-neutral-300"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {lastCheck && (
        <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full border border-amber-400/60 bg-black/80 px-4 py-1 text-xs font-mono">
          {STAT_LABELS[lastCheck.stat as keyof typeof STAT_LABELS]} d20=
          {lastCheck.roll} + {lastCheck.statValue} = {lastCheck.total} vs{" "}
          {lastCheck.dc}{" "}
          <span className={lastCheck.success ? "text-emerald-400" : "text-rose-400"}>
            {lastCheck.success ? "성공" : "실패"}
          </span>
        </div>
      )}

      {/* Chat body */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {bubbleLines.map((line, i) => {
            if (isTimestampNarration(line)) {
              return (
                <div
                  key={i}
                  className="my-2 self-center text-[10px] tracking-wide text-neutral-500"
                >
                  {line.text}
                </div>
              );
            }
            if (line.speaker === "system") {
              return (
                <div
                  key={i}
                  className="my-2 flex items-center gap-3 self-stretch px-2 text-neutral-500"
                >
                  <span className="h-px flex-1 bg-neutral-800" />
                  <span className="text-[11px] leading-relaxed">
                    {line.text}
                  </span>
                  <span className="h-px flex-1 bg-neutral-800" />
                </div>
              );
            }
            if (line.speaker === "pc") {
              return (
                <div
                  key={i}
                  className="max-w-[78%] self-end rounded-2xl rounded-br-md bg-amber-300 px-3.5 py-2 text-sm text-black"
                >
                  {line.text}
                </div>
              );
            }
            return (
              <div
                key={i}
                className="max-w-[78%] self-start rounded-2xl rounded-bl-md bg-neutral-800 px-3.5 py-2 text-sm text-neutral-100"
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* External panel — author prose (narration outside the chat) or PC's
          interior monologue (thought). Only the current one is shown. */}
      {externalLine && (
        <div className="border-t border-neutral-800 bg-neutral-950/95 px-5 py-4">
          {externalLine.speaker === "thought" ? (
            <>
              <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-neutral-600">
                {pc.name} · 속
              </div>
              <p className="text-sm italic leading-relaxed text-neutral-400">
                {externalLine.text}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-neutral-400">
              {externalLine.text}
            </p>
          )}
        </div>
      )}

      {/* Bottom action row */}
      <div className="border-t border-neutral-800 bg-neutral-950/95 p-4">
        {choices.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {choices.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => runChoice(c)}
                  disabled={busy}
                  className="w-full rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-left text-sm text-amber-100 disabled:opacity-50 active:bg-amber-500/15"
                >
                  {c.check && (
                    <span className="mr-2 rounded-md bg-amber-900/40 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                      {STAT_LABELS[c.check.stat]} DC{c.check.dc}
                    </span>
                  )}
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={advance}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm active:bg-neutral-800"
          >
            다음 ▶
          </button>
        )}
      </div>
    </div>
  );
}
