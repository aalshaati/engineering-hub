import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";

const PORTFOLIO_SYSTEM = `You are a halal-finance specialist and financial research assistant for Abdulla, a Muslim investor.

Current holdings (must NOT suggest these):
SPUS, UMMA, NVDA, TSM, LLY, JNJ, AMZN, AVGO

Investor profile:
- Muslim investor — halal/Sharia compliance is non-negotiable
- Roth IRA $6,966 (all SPUS), Boeing 401k $6,187
- Growth-focused, passive investing style
- Still learning financial literacy

Halal screening criteria (all must pass):
- No alcohol, tobacco, weapons/defense, gambling, adult content, conventional banking/insurance, pork
- Debt-to-market-cap ratio should be reasonable (generally under 33%)
- Interest income should be minimal relative to total revenue
- Must be a legitimate operating business with real products/services`;

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
      stopWhen: stepCountIs(10),
      headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
      system: {
        role: "system" as const,
        content: PORTFOLIO_SYSTEM,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      prompt: `Research and identify exactly 3 halal-compliant, high-growth stock suggestions that Abdulla does not already own. Search for current analyst recommendations and growth stocks that pass halal screening. Verify each candidate passes halal screening before including it.

Return ONLY a valid JSON array — no markdown, no explanation. Exactly 3 items:
[
  {
    "ticker": "MSFT",
    "name": "Microsoft Corporation",
    "riskLevel": "medium",
    "rationale": "First sentence about why this is a strong growth investment. Second sentence about recent performance or catalyst.",
    "halalReason": "One sentence explaining why this passes Sharia screening (low debt, no haram business lines, etc.).",
    "pros": ["Pro point one", "Pro point two"],
    "cons": ["Con point one", "Con point two"]
  }
]

Rules:
- riskLevel must be exactly "low", "medium", or "high"
- All 3 must genuinely pass halal screening — do not suggest banks, insurers, alcohol, tobacco, weapons, gambling
- Favor technology, healthcare, consumer goods, industrials with clean business models
- rationale must be exactly 2 sentences
- pros and cons must each be exactly 2 items
- Your entire response must start with [ and end with ]`,
    });

    const data = extractJSON(result.text);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
