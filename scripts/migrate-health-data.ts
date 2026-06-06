import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type Reading = { qty: number; date: string; source?: string };
type HaeMetric = { name: string; units: string; data: Reading[] };
type MetricEntry = { timestamp: string; data?: { metrics?: HaeMetric[] }; [key: string]: unknown };

// Fields to aggregate into daily totals
const SUM_METRICS = ["step_count", "dietary_energy", "active_energy", "protein", "carbohydrates", "total_fat"] as const;
const DAILY_FIELD: Record<string, string> = {
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

// Extract the local YYYY-MM-DD from "2026-06-06 10:37:00 -0700"
function localDate(dateStr: string): string {
  return dateStr.substring(0, 10);
}

async function main() {
  console.log("Reading health:metrics list (read-only)...");
  const entries = await redis.lrange<MetricEntry>("health:metrics", 0, -1);
  console.log(`  Found ${entries.length} entries\n`);

  // Per-day: { metricName -> dedupKey -> Reading }
  const dayRawMap: Record<string, Record<string, Map<string, Reading>>> = {};
  const daySourcesMap: Record<string, Set<string>> = {};

  for (const entry of entries) {
    const metrics: HaeMetric[] = entry.data?.metrics ?? [];
    for (const metric of metrics) {
      for (const reading of metric.data ?? []) {
        const day = localDate(reading.date);
        if (!dayRawMap[day]) dayRawMap[day] = {};
        if (!dayRawMap[day][metric.name]) dayRawMap[day][metric.name] = new Map();
        if (!daySourcesMap[day]) daySourcesMap[day] = new Set();

        const dk = dedupKey(metric.name, reading);
        dayRawMap[day][metric.name].set(dk, reading);
        if (reading.source) daySourcesMap[day].add(reading.source);
      }
    }
  }

  const days = Object.keys(dayRawMap).sort();
  console.log(`Days found across all entries: ${days.join(", ")}\n`);

  const now = new Date().toISOString();
  const writtenDays: string[] = [];

  for (const day of days) {
    const metricMap = dayRawMap[day];

    // Compute daily totals
    const totals: Record<string, number | null> = {
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

    for (const metricName of SUM_METRICS) {
      const readings = metricMap[metricName];
      if (!readings || readings.size === 0) continue;
      const sum = [...readings.values()].reduce((acc, r) => acc + r.qty, 0);
      totals[DAILY_FIELD[metricName]] = Math.round(sum * 10) / 10;
    }

    // Heart rate: most recent reading for this day
    const hrReadings = metricMap["heart_rate"];
    if (hrReadings && hrReadings.size > 0) {
      const sorted = [...hrReadings.values()].sort((a, b) => a.date.localeCompare(b.date));
      totals.heart_rate_latest = Math.round(sorted[sorted.length - 1].qty);
    }

    // Resting heart rate
    const rhrReadings = metricMap["resting_heart_rate"];
    if (rhrReadings && rhrReadings.size > 0) {
      const sorted = [...rhrReadings.values()].sort((a, b) => a.date.localeCompare(b.date));
      totals.resting_heart_rate = Math.round(sorted[sorted.length - 1].qty);
    }

    // Sleep: most recent sleep_analysis reading (the data route uses 36h lookback;
    // for the migration we just use the most recent reading on or within 36h of this day)
    const sleepReadings = metricMap["sleep_analysis"];
    if (sleepReadings && sleepReadings.size > 0) {
      const sorted = [...sleepReadings.values()].sort((a, b) => a.date.localeCompare(b.date));
      totals.sleep_hours = Math.round(sorted[sorted.length - 1].qty * 10) / 10;
    }

    const dailyRecord = {
      date: day,
      ...totals,
      sources: [...(daySourcesMap[day] ?? [])].sort(),
      updated_at: now,
    };

    // Raw record: metric_name -> array of unique readings
    const rawMetrics: Record<string, Reading[]> = {};
    for (const [metricName, readingMap] of Object.entries(metricMap)) {
      rawMetrics[metricName] = [...readingMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    }
    const rawRecord = { date: day, metrics: rawMetrics, updated_at: now };

    await Promise.all([
      redis.set(`health:daily:${day}`, JSON.stringify(dailyRecord)),
      redis.set(`health:raw:${day}`, JSON.stringify(rawRecord)),
    ]);

    writtenDays.push(day);
  }

  console.log(`\nWrote ${writtenDays.length} day pairs (health:daily:* and health:raw:*):`);
  writtenDays.forEach(d => console.log(`  health:daily:${d}   health:raw:${d}`));

  // Print full daily totals for the 3 most recent days
  const recentDays = writtenDays.slice(-3);
  console.log(`\n${"=".repeat(60)}`);
  console.log("DAILY TOTALS — 3 most recent days (sanity check)");
  console.log("=".repeat(60));
  for (const day of recentDays) {
    const record = await redis.get<Record<string, unknown>>(`health:daily:${day}`);
    console.log(`\n--- ${day} ---`);
    console.log(JSON.stringify(record, null, 2));
  }
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
