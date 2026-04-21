import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const RequestSchema = z.object({
  npcId: z.string(),
  systemPrompt: z.string(),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  playerLine: z.string(),
});

const client = new Anthropic();

export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { systemPrompt, history, playerLine } = parsed.data;

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      ...history,
      { role: "user" as const, content: playerLine },
    ],
  });

  const reply = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((b) => b.text)
    .join("\n");

  return NextResponse.json({ reply, usage: response.usage });
}
