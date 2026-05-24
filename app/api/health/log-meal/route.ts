import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { meal, calories, notes } = await req.json();
    if (!meal) return Response.json({ error: "meal is required" }, { status: 400 });

    await redis.rpush("health:meals", {
      meal,
      calories: Number(calories) || 0,
      notes: notes ?? "",
      timestamp: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
