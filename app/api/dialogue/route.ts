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

export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { systemPrompt, history, playerLine } = parsed.data;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    contents: [
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      { role: "user", parts: [{ text: playerLine }] },
    ],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 512,
    },
  });

  return NextResponse.json({
    reply: response.text ?? "",
    usage: response.usageMetadata,
  });
}
