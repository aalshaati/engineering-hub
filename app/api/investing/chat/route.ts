import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

const PORTFOLIO_SYSTEM = `You are a knowledgeable financial assistant helping Abdulla research his halal portfolio investments.

Abdulla's portfolio:
- SPUS (S&P 500 Shariah ETF): 82.75 shares — largest holding
- UMMA (Wahed FTSE USA Shariah ETF): 59.92 shares
- NVDA (Nvidia): 2.51 shares
- TSM (Taiwan Semiconductor): 0.9 shares
- LLY (Eli Lilly): 0.061471 shares
- JNJ (Johnson & Johnson): 1.03 shares
- AMZN (Amazon): 1.02 shares
- AVGO (Broadcom): 0.697949 shares

Account context:
- Roth IRA: $6,966 total (all invested in SPUS)
- Boeing 401k: $6,187
- Investment style: passive, growth-focused
- Learning financial literacy — explain concepts clearly when needed
- All investments must be halal/Sharia compliant (no alcohol, tobacco, weapons, conventional banking, gambling, adult content)

Guidelines:
- Be direct and educational
- Use simple language, avoid jargon unless explaining it
- Always flag halal compliance concerns when relevant
- When giving investment opinions, remind that this is not formal financial advice
- Use markdown formatting for clarity`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not set in .env.local", { status: 500 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
    system: {
      role: "system" as const,
      content: PORTFOLIO_SYSTEM,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
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
