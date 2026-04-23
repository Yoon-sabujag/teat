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
  const raw =
    err && typeof err === "object"
      ? (err as Record<string, unknown>)
      : { message: String(err) };

  let status =
    typeof raw.status === "number"
      ? raw.status
      : typeof raw.code === "number"
        ? raw.code
        : undefined;
  let message =
    typeof raw.message === "string"
      ? raw.message
      : typeof raw.error === "string"
        ? raw.error
        : undefined;

  // The @google/genai SDK frequently wraps upstream HTTP errors as a
  // JSON-stringified message like
  //   {"error":{"code":503,"message":"This model is currently…"}}
  // Unwrap one level so the client sees something readable.
  if (message) {
    try {
      const inner = JSON.parse(message) as {
        error?: { code?: number; message?: string };
      };
      if (inner?.error) {
        status = inner.error.code ?? status;
        message = inner.error.message ?? message;
      }
    } catch {
      // Not JSON, keep the raw message.
    }
  }

  return { status, message };
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

const RETRY_DELAYS_MS = [500, 1500, 3000];

async function callWithRetry(
  systemPrompt: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await callGemini(systemPrompt, contents);
    } catch (err) {
      lastErr = err;
      const { status } = parseGeminiError(err);
      const transient =
        status === 503 || status === 502 || status === 504 || status === 500;
      if (!transient || attempt === RETRY_DELAYS_MS.length) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastErr;
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
    response = await callWithRetry(systemPrompt, contents);
  } catch (err) {
    const { status, message } = parseGeminiError(err);
    if (status === 429) {
      return NextResponse.json(
        {
          error: "요청이 너무 잦습니다",
          detail: "잠시 후 다시 시도해주세요 (Gemini 분당 한도 초과).",
          geminiStatus: 429,
        },
        { status: 429 },
      );
    }
    if (status === 503) {
      return NextResponse.json(
        {
          error: "Gemini 서버 과부하",
          detail: "수 초 후 다시 시도해주세요. 재시도 3회 모두 실패했습니다.",
          geminiStatus: 503,
        },
        { status: 503 },
      );
    }
    if (status === 400) {
      return NextResponse.json(
        {
          error: "프롬프트 형식 문제",
          detail: message ?? "",
          geminiStatus: 400,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "LLM 호출 실패",
        detail: message ?? "",
        geminiStatus: status,
      },
      { status: 502 },
    );
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
