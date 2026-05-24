import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { Redis } from "@upstash/redis";

type MetricEntry = { timestamp: string; [key: string]: unknown };
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
    const [allMetrics, allMeals] = await Promise.all([
      redis.lrange<MetricEntry>("health:metrics", 0, -1),
      redis.lrange<MealEntry>("health:meals", 0, -1),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMetrics = allMetrics.filter(
      (m) => new Date(m.timestamp) >= sevenDaysAgo
    );
    const recentMeals = allMeals.filter(
      (m) => new Date(m.timestamp) >= sevenDaysAgo
    );

    const hasData = recentMetrics.length > 0 || recentMeals.length > 0;
    const prompt = hasData
      ? `Here is my Apple Health data and meal log from the last 7 days:

METRICS:
${JSON.stringify(recentMetrics, null, 2)}

MEALS:
${JSON.stringify(recentMeals, null, 2)}

Give me direct, specific, actionable nutrition and health insights. Cover:
1. Nutrition patterns from meals logged
2. Activity and sleep trends from health metrics
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
