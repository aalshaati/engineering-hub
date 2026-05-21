import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

const PORTFOLIO_SYSTEM = `You are a financial research assistant for Abdulla, a Muslim investor who follows halal/Sharia-compliant investing principles.

Portfolio holdings:
- SPUS (S&P 500 Shariah ETF): 82.75 shares
- UMMA (Wahed FTSE USA Shariah ETF): 59.92 shares
- NVDA (Nvidia): 2.51 shares
- TSM (Taiwan Semiconductor): 0.9 shares
- LLY (Eli Lilly): 0.061471 shares
- JNJ (Johnson & Johnson): 1.03 shares
- AMZN (Amazon): 1.02 shares
- AVGO (Broadcom): 0.697949 shares

Context: Roth IRA $6,966 (all SPUS), Boeing 401k $6,187. Passive growth investor, still learning financial literacy. All investments must be halal/Sharia compliant.`;

function extractJSON(text: string): unknown {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : text.trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY not set", { status: 500 });
  }

  try {
    const result = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      tools: {
        webSearch: anthropic.tools.webSearch_20250305(),
      },
      stopWhen: stepCountIs(12),
      system: PORTFOLIO_SYSTEM,
      prompt: `Search for today's latest news for each of these stocks: SPUS, UMMA, NVDA, TSM, LLY, JNJ, AMZN, AVGO. Search each ticker individually for the most recent news.

Return ONLY a valid JSON array — no markdown, no explanation, no extra text before or after. Use this exact structure:
[
  {
    "ticker": "NVDA",
    "sentiment": "positive",
    "headline": "Exact headline here",
    "why": "One plain-English sentence explaining why this matters to me as a holder of this stock.",
    "source": "Source name",
    "time": "2h ago"
  }
]

Rules:
- Include 1–2 items per ticker if news exists today; skip a ticker only if there is truly no recent news
- sentiment must be exactly "positive", "negative", or "neutral" — no other values
- "why" must be specific to a holder's financial interest (price impact, business outlook, risk)
- Use relative time strings: "1h ago", "3h ago", "Today", "Yesterday"
- Your entire response must start with [ and end with ]`,
    });

    const data = extractJSON(result.text);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
