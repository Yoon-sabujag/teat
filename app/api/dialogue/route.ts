import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const RequestSchema = z.object({
  npcId: z.string(),
  systemPrompt: z.string(),
  history: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    }),
  ),
  playerLine: z.string(),
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type GeminiError = { status?: number; message?: string };

function parseGeminiError(err: unknown): GeminiError {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const status =
      typeof e.status === "number"
        ? e.status
        : typeof e.code === "number"
          ? e.code
          : undefined;
    const message =
      typeof e.message === "string"
        ? e.message
        : typeof e.error === "string"
          ? e.error
          : undefined;
    return { status, message };
  }
  return { message: String(err) };
}

async function callGemini(
  systemPrompt: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
) {
  return ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
}

export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { systemPrompt, history, playerLine } = parsed.data;
  const contents = [
    ...history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: playerLine }] },
  ];

  let response;
  try {
    response = await callGemini(systemPrompt, contents);
  } catch (err) {
    const { status, message } = parseGeminiError(err);
    // Retry once on transient server errors.
    if (status && status >= 500 && status < 600) {
      try {
        response = await callGemini(systemPrompt, contents);
      } catch (err2) {
        const second = parseGeminiError(err2);
        return NextResponse.json(
          {
            error: "LLM 호출 실패 (재시도 후에도)",
            detail: second.message ?? message,
            geminiStatus: second.status ?? status,
          },
          { status: 502 },
        );
      }
    } else if (status === 429) {
      return NextResponse.json(
        {
          error: "요청이 너무 잦습니다 (Gemini rate limit).",
          detail: message,
          geminiStatus: 429,
        },
        { status: 429 },
      );
    } else if (status === 400) {
      return NextResponse.json(
        {
          error: "프롬프트 형식 문제",
          detail: message,
          geminiStatus: 400,
        },
        { status: 400 },
      );
    } else {
      return NextResponse.json(
        {
          error: "LLM 호출 실패",
          detail: message,
          geminiStatus: status,
        },
        { status: 502 },
      );
    }
  }

  const text = response.text ?? "";
  if (!text.trim()) {
    return NextResponse.json(
      {
        error: "빈 응답",
        detail: "안전 필터 차단 가능성. 다른 표현으로 시도해보세요.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    reply: text,
    usage: response.usageMetadata,
  });
}
