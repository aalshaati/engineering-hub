import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { Redis } from "@upstash/redis";

type MealEntry = { timestamp: string; meal: string; calories: number; notes: string };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY not set", { status: 500 });
  }

  try {
    const [allDailyKeys, allMeals] = await Promise.all([
      redis.keys("health:daily:*"),
      redis.lrange<MealEntry>("health:meals", 0, -1),
    ]);

    const recentKeys = allDailyKeys.sort().slice(-7);
    const dailyRecords = recentKeys.length > 0
      ? await Promise.all(recentKeys.map((k) => redis.get(k)))
      : [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMeals = allMeals.filter((m) => new Date(m.timestamp) >= sevenDaysAgo);

    const hasData = dailyRecords.length > 0 || recentMeals.length > 0;
    const prompt = hasData
      ? `Here is my Apple Health daily summaries and meal log from the last 7 days.

DAILY SUMMARIES (each record = one day; calories_in = food/dietary energy, calories_burned = active energy from movement):
${JSON.stringify(dailyRecords.filter(Boolean), null, 2)}

MEALS LOGGED:
${JSON.stringify(recentMeals, null, 2)}

Give me direct, specific, actionable nutrition and health insights. Cover:
1. Nutrition patterns — daily calorie intake vs burn, protein adequacy, macro balance
2. Activity trends from step counts
3. 2–3 concrete recommendations for this week`
      : `I have no health data or meals logged yet. Give me general recommendations for getting started with health tracking, including what metrics matter most and how to build a consistent meal logging habit. Be direct and practical.`;

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: {
        role: "system" as const,
        content:
          "You are a personal health coach reviewing Abdulla's Apple Health data and meal logs. Be direct, specific, and actionable. No fluff. Use plain text, no markdown headers.",
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      messages: [{ role: "user", content: prompt }],
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`__ERROR__: ${message}`, { status: 500 });
  }
}
