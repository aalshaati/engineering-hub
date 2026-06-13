import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type Reading = { qty: number; date: string; source?: string };
type HaeMetric = { name: string; units: string; data: Reading[] };
type RawRecord = { date: string; metrics: Record<string, Reading[]>; updated_at: string };
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

const SUM_METRICS: Record<string, string> = {
  step_count: "steps",
  dietary_energy: "calories_in",
  active_energy: "calories_burned",
  protein: "protein_g",
  carbohydrates: "carbs_g",
  total_fat: "fat_g",
};

function dedupKey(metricName: string, r: Reading): string {
  return `${metricName}|${r.date}|${r.qty}|${r.source ?? ""}`;
}

// "2026-06-06 10:37:00 -0700" → "2026-06-06"
function localDate(dateStr: string): string {
  return dateStr.substring(0, 10);
}

function computeDaily(day: string, rawMetrics: Record<string, Reading[]>): DailyRecord {
  const totals: Omit<DailyRecord, "date" | "sources" | "updated_at"> = {
    steps: null,
    calories_in: null,
    calories_burned: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    heart_rate_latest: null,
    resting_heart_rate: null,
    sleep_hours: null,
  };

  for (const [metricName, fieldName] of Object.entries(SUM_METRICS)) {
    const readings = rawMetrics[metricName];
    if (!readings?.length) continue;
    const sum = readings.reduce((acc, r) => acc + r.qty, 0);
    (totals as Record<string, number | null>)[fieldName] = Math.round(sum * 10) / 10;
  }

  const hrReadings = rawMetrics["heart_rate"];
  if (hrReadings?.length) {
    const sorted = [...hrReadings].sort((a, b) => a.date.localeCompare(b.date));
    totals.heart_rate_latest = Math.round(sorted[sorted.length - 1].qty);
  }

  const rhrReadings = rawMetrics["resting_heart_rate"];
  if (rhrReadings?.length) {
    const sorted = [...rhrReadings].sort((a, b) => a.date.localeCompare(b.date));
    totals.resting_heart_rate = Math.round(sorted[sorted.length - 1].qty);
  }

  const sleepReadings = rawMetrics["sleep_analysis"];
  if (sleepReadings?.length) {
    const sorted = [...sleepReadings].sort((a, b) => a.date.localeCompare(b.date));
    totals.sleep_hours = Math.round(sorted[sorted.length - 1].qty * 10) / 10;
  }

  const allSources = new Set<string>();
  for (const readings of Object.values(rawMetrics)) {
    for (const r of readings) {
      if (r.source) allSources.add(r.source);
    }
  }

  return { date: day, ...totals, sources: [...allSources].sort(), updated_at: new Date().toISOString() };
}

async function upsertDay(day: string, incomingMetrics: Record<string, Reading[]>): Promise<void> {
  const [existingRaw, existingDaily] = await Promise.all([
    redis.get<RawRecord>(`health:raw:${day}`),
    redis.get<DailyRecord>(`health:daily:${day}`),
  ]);
  const existingMetrics: Record<string, Reading[]> = existingRaw?.metrics ?? {};

  // Each sync is the source of truth for the metrics it contains, on this day.
  // So we REPLACE a day's readings for an incoming metric rather than unioning
  // them with what we had before. This is what makes deletions propagate: if you
  // remove a food in your phone app, the next sync's nutrition readings no longer
  // include it, so the stale reading drops out instead of lingering forever.
  // Metrics absent from this sync are left untouched (e.g. don't wipe steps when
  // only nutrition synced). Assumes Health Auto Export re-exports the full day for
  // any metric it sends — the standard "today" automation does exactly this.
  const mergedMetrics: Record<string, Reading[]> = { ...existingMetrics };

  for (const [metricName, readings] of Object.entries(incomingMetrics)) {
    // Dedupe within this sync in case a reading appears twice in one payload.
    const deduped = new Map<string, Reading>();
    for (const r of readings) deduped.set(dedupKey(metricName, r), r);
    mergedMetrics[metricName] = [...deduped.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  const newRecord = computeDaily(day, mergedMetrics);
  // Manually-logged fields aren't in the synced metrics, so carry them forward —
  // otherwise the rebuilt record would wipe them on the next Apple Health sync.
  if (existingDaily?.weight_lb != null) newRecord.weight_lb = existingDaily.weight_lb;
  if (existingDaily?.creatine_taken != null) newRecord.creatine_taken = existingDaily.creatine_taken;

  await Promise.all([
    redis.set(`health:daily:${day}`, JSON.stringify(newRecord)),
    redis.set(`health:raw:${day}`, JSON.stringify({ date: day, metrics: mergedMetrics, updated_at: new Date().toISOString() })),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Safety net: keep appending to the original flat list
    await redis.rpush("health:metrics", { timestamp: new Date().toISOString(), ...body });

    // Upsert per-day records — errors here don't fail the webhook
    try {
      const haeMetrics: HaeMetric[] = body?.data?.metrics ?? [];

      const dayMetrics: Record<string, Record<string, Reading[]>> = {};
      for (const metric of haeMetrics) {
        for (const reading of metric.data ?? []) {
          const day = localDate(reading.date);
          if (!dayMetrics[day]) dayMetrics[day] = {};
          if (!dayMetrics[day][metric.name]) dayMetrics[day][metric.name] = [];
          dayMetrics[day][metric.name].push(reading);
        }
      }

      await Promise.all(Object.entries(dayMetrics).map(([day, metrics]) => upsertDay(day, metrics)));
    } catch (upsertErr) {
      console.error("health:daily upsert failed:", upsertErr);
    }

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
