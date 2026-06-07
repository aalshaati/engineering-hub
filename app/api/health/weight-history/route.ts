import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    }).reverse(); // oldest first for chart rendering

    const keys = dates.map((d) => `health:daily:${d}`);
    const records = await redis.mget<Record<string, unknown>[]>(...keys);

    const result = dates.map((date, i) => ({
      date,
      weight_lb: typeof records[i]?.weight_lb === "number" ? (records[i].weight_lb as number) : null,
    }));

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
