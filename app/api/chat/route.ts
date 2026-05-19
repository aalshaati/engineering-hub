import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const SYSTEM_PROMPT = `You are Claude, an AI assistant built into Abdulla's personal Engineering Hub.
Abdulla is a computer engineering student interning at Genentech in summer 2026.
He works on coding, AI, and hardware projects. Help him with technical questions,
hardware builds, code problems, and engineering concepts.
Be direct and concise. Use markdown formatting where it helps clarity.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not set in .env.local", { status: 500 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(encoder.encode(`__ERROR__: ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
