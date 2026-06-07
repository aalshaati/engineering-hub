import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { weight_lb } = await req.json();
    const weightVal = parseFloat(weight_lb);
    if (!weightVal || weightVal < 50 || weightVal > 500)
      return Response.json({ error: "invalid weight" }, { status: 400 });

    const todayKey = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    });

    const existing =
      (await redis.get<Record<string, unknown>>(`health:daily:${todayKey}`)) ??
      { date: todayKey };
    existing.weight_lb = weightVal;
    await redis.set(`health:daily:${todayKey}`, JSON.stringify(existing));

    return Response.json({ ok: true, weight_lb: weightVal, date: todayKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
