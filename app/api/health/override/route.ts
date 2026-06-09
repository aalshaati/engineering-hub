import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ALLOWED_FIELDS = new Set([
  "steps",
  "calories_in",
  "calories_burned",
  "protein_g",
  "carbs_g",
  "fat_g",
]);

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { field, value, date } = await req.json();
    if (!ALLOWED_FIELDS.has(field)) {
      return Response.json({ error: `Invalid field: ${field}` }, { status: 400 });
    }
    const day = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayKey();
    const key = `health:override:${day}`;

    const existing = (await redis.get<Record<string, number>>(key)) ?? {};

    if (value === null || value === undefined || value === "") {
      delete existing[field];
    } else {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        return Response.json({ error: "value must be a non-negative number" }, { status: 400 });
      }
      existing[field] = num;
    }

    if (Object.keys(existing).length === 0) {
      await redis.del(key);
    } else {
      await redis.set(key, JSON.stringify(existing));
    }

    return Response.json({ ok: true, date: day, overrides: existing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
