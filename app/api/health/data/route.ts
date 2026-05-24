import { Redis } from "@upstash/redis";

type MetricEntry = { timestamp: string; [key: string]: unknown };
type MealEntry = { timestamp: string; meal: string; calories: number; notes: string };

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const [metrics, meals] = await Promise.all([
      redis.lrange<MetricEntry>("health:metrics", 0, -1),
      redis.lrange<MealEntry>("health:meals", 0, -1),
    ]);
    return Response.json({ metrics, meals });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
