// Agent heartbeat — writes a status record to Redis for the /agents dashboard.
// Usage: node scripts/agent-heartbeat.mjs <agent-id> <ok|failed> "summary text"
// Silent-failure by design: a dead Redis must never fail the skill run that
// called this, so all Redis errors exit 0 with a warning on stderr.
import { Redis } from "@upstash/redis";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(PROJECT_ROOT, ".env.local");

const [, , agent, status, summary = ""] = process.argv;

if (!agent || !["ok", "failed"].includes(status)) {
  console.error('Usage: node scripts/agent-heartbeat.mjs <agent-id> <ok|failed> "summary text"');
  process.exit(1);
}

try {
  for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const entry = { agent, status, summary, ts: new Date().toISOString() };
  await redis.set(`agents:last:${agent}`, JSON.stringify(entry));
  await redis.lpush("agents:log", JSON.stringify(entry));
  await redis.ltrim("agents:log", 0, 49);
  console.log(JSON.stringify({ written: true, key: `agents:last:${agent}` }));
} catch (err) {
  console.error(`heartbeat skipped: ${err?.message ?? err}`);
  process.exit(0);
}
