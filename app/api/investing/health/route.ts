import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

const PORTFOLIO_SYSTEM = `You are a blunt, honest financial analyst helping Abdulla review his halal portfolio. Do not sugarcoat. Give direct, actionable verdicts.

Portfolio holdings:
- SPUS (S&P 500 Shariah ETF): 82.75 shares
- UMMA (Wahed FTSE USA Shariah ETF): 59.92 shares
- NVDA (Nvidia): 2.51 shares
- TSM (Taiwan Semiconductor): 0.9 shares
- LLY (Eli Lilly): 0.061471 shares
- JNJ (Johnson & Johnson): 1.03 shares
- AMZN (Amazon): 1.02 shares
- AVGO (Broadcom): 0.697949 shares

Context: Roth IRA $6,966 (all SPUS), Boeing 401k $6,187. Passive growth investor, learning financial literacy. Must remain halal/Sharia compliant.

Verdict definitions:
- HOLD: Strong fundamentals, no immediate concerns, keep or add
- WATCH: Mixed signals, monitor closely, do not add right now
- SELL: Significant risk, deteriorating fundamentals, or fundamentally problematic`;

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
      headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
      system: {
        role: "system" as const,
        content: PORTFOLIO_SYSTEM,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      prompt: `Search for the current health and analyst outlook for each of these holdings: SPUS, UMMA, NVDA, TSM, LLY, JNJ, AMZN, AVGO. Look up recent analyst ratings, earnings results, and any red flags.

Return ONLY a valid JSON array — no markdown, no explanation. One entry per ticker:
[
  {
    "ticker": "NVDA",
    "verdict": "hold",
    "summary": "First blunt sentence about current state. Second sentence about key risk or upside. Optional third sentence if truly needed.",
    "pros": ["Specific pro with data if possible", "Second specific pro"],
    "cons": ["Specific con with data if possible", "Second specific con"],
    "source": "Source name (e.g. Bloomberg, Seeking Alpha, Yahoo Finance)"
  }
]

Rules:
- verdict must be exactly "hold", "watch", or "sell" — nothing else
- Be blunt. If something looks bad, say so. No corporate speak.
- summary must be 2–3 sentences maximum
- pros and cons must each be exactly 2 items — be specific, not generic
- Your entire response must start with [ and end with ]`,
    });

    const data = extractJSON(result.text);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
