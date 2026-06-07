import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(PROJECT_ROOT, ".env.local");

for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  const m = line.match(/^([^#=\s]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function todayLA() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

const [, , cmd, ...args] = process.argv;

if (cmd === "read-day") {
  const date = args[0] ?? todayLA();
  const record = await redis.get(`health:daily:${date}`);
  console.log(JSON.stringify({ date, record: record ?? null, weight_lb: record?.weight_lb ?? null }, null, 2));

} else if (cmd === "read-days") {
  const n = parseInt(args[0] ?? "14", 10);
  const results = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const record = await redis.get(`health:daily:${date}`);
    results.push({ date, record: record ?? null, weight_lb: record?.weight_lb ?? null });
  }
  console.log(JSON.stringify(results, null, 2));

} else if (cmd === "write-weight") {
  const date = args[0];
  const value = args[1];
  if (!date || !value) {
    console.error("Usage: write-weight YYYY-MM-DD VALUE");
    process.exit(1);
  }
  const existing = (await redis.get(`health:daily:${date}`)) ?? { date };
  existing.weight_lb = parseFloat(value);
  await redis.set(`health:daily:${date}`, JSON.stringify(existing));
  console.log(JSON.stringify({ written: true, key: `health:daily:${date}`, field: "weight_lb", value: parseFloat(value) }));

} else {
  console.error("Commands: read-day [YYYY-MM-DD] | read-days [n] | write-weight YYYY-MM-DD VALUE");
  process.exit(1);
}
