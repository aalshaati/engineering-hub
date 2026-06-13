import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { creatine_taken } = await req.json();
    if (typeof creatine_taken !== "boolean")
      return Response.json({ error: "creatine_taken must be a boolean" }, { status: 400 });

    const todayKey = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    });

    const existing =
      (await redis.get<Record<string, unknown>>(`health:daily:${todayKey}`)) ??
      { date: todayKey };
    existing.creatine_taken = creatine_taken;
    await redis.set(`health:daily:${todayKey}`, JSON.stringify(existing));

    return Response.json({ ok: true, creatine_taken, date: todayKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
