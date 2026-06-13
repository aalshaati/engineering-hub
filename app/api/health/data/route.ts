import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type DailyRecord = {
  date: string;
  steps: number | null;
  calories_in: number | null;
  calories_burned: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  heart_rate_latest: number | null;
  resting_heart_rate: number | null;
  sleep_hours: number | null;
  weight_lb?: number | null;
  creatine_taken?: boolean | null;
  sources: string[];
  updated_at: string;
};

type MealEntry = { timestamp: string; meal: string; calories: number; notes: string };

export async function GET() {
  try {
    // en-CA locale produces YYYY-MM-DD, matching our Redis key format.
    // Readings from Health Auto Export are timestamped in Pacific time, so use
    // the same timezone when computing "today" — otherwise the server's UTC clock
    // would give the wrong key after ~5pm Pacific.
    const todayKey = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    });

    const [daily, meals, overrides] = await Promise.all([
      redis.get<DailyRecord>(`health:daily:${todayKey}`),
      redis.lrange<MealEntry>("health:meals", 0, -1),
      redis.get<Record<string, number>>(`health:override:${todayKey}`),
    ]);

    const o = overrides ?? {};
    const todayMetrics = {
      steps: o.steps ?? daily?.steps ?? null,
      heartRate: daily?.heart_rate_latest ?? null,
      sleep: daily?.sleep_hours ?? null,
      calories_in: o.calories_in ?? daily?.calories_in ?? null,
      calories_burned: o.calories_burned ?? daily?.calories_burned ?? null,
      protein_g: o.protein_g ?? daily?.protein_g ?? null,
      weight_lb: daily?.weight_lb ?? null,
      creatine_taken: daily?.creatine_taken ?? null,
    };

    return Response.json({ todayMetrics, meals, overrides: o });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
