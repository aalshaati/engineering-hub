import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export type Heartbeat = {
  agent: string;
  status: "ok" | "failed";
  summary: string;
  ts: string;
};

export type AgentState = "ok" | "failed" | "stale" | "never";

type AgentDef = {
  id: string;
  name: string;
  glyph: string;
  kind: "scheduled" | "on-demand";
  schedule: string;
  trigger: string;
  description: string;
  staleAfterHours?: number;
};

const AGENTS: AgentDef[] = [
  {
    id: "briefing",
    name: "Morning Briefing",
    glyph: "☀",
    kind: "scheduled",
    schedule: "daily 07:03",
    trigger: 'launchd com.abdulla.hub.morning-briefing → claude -p "/briefing"',
    description:
      "Writes today's Obsidian daily note: health snapshot, training status, yesterday's commits.",
    staleAfterHours: 36,
  },
  {
    id: "weekly",
    name: "Weekly Review",
    glyph: "▤",
    kind: "scheduled",
    schedule: "sun 09:07",
    trigger: "launchd com.abdulla.hub.weekly-review → Terminal /checkin weekly",
    description:
      "Interactive weekly health review; refreshes Hevy routine targets and the Health-Coach-Log.",
    staleAfterHours: 192,
  },
  {
    id: "daily",
    name: "Daily Check-in",
    glyph: "✓",
    kind: "on-demand",
    schedule: "manual",
    trigger: "/checkin daily · /daily",
    description:
      "Interactive daily health check-in: morning weight, kcal/protein verdict, rotation check.",
  },
  {
    id: "coach",
    name: "Coach Chat",
    glyph: "✦",
    kind: "on-demand",
    schedule: "manual",
    trigger: "/coach",
    description:
      "Conversational coaching session. Read-only: no Obsidian, Hevy, or health-data writes.",
  },
  {
    id: "ship",
    name: "Ship",
    glyph: "↯",
    kind: "on-demand",
    schedule: "manual",
    trigger: "/ship (global)",
    description:
      "Stage, commit, push, and verify the Vercel auto-deploy for the current repo.",
  },
  {
    id: "log",
    name: "Build Log",
    glyph: "✎",
    kind: "on-demand",
    schedule: "manual",
    trigger: "/log",
    description:
      "Appends a dated Build Log entry to Engineering-Hub.md from recent git history.",
  },
];

function computeState(def: AgentDef, last: Heartbeat | null, now: number): AgentState {
  if (!last) return "never";
  if (last.status === "failed") return "failed";
  if (def.kind === "scheduled" && def.staleAfterHours) {
    const ageHours = (now - new Date(last.ts).getTime()) / 3_600_000;
    if (ageHours > def.staleAfterHours) return "stale";
  }
  return "ok";
}

export async function GET() {
  try {
    const [lasts, log] = await Promise.all([
      redis.mget<(Heartbeat | null)[]>(...AGENTS.map((a) => `agents:last:${a.id}`)),
      redis.lrange<Heartbeat>("agents:log", 0, 49),
    ]);

    const now = Date.now();
    const agents = AGENTS.map((def, i) => ({
      ...def,
      last: lasts[i] ?? null,
      state: computeState(def, lasts[i] ?? null, now),
    }));

    return Response.json({ agents, log, generatedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
