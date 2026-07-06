"use client";

import { useEffect, useState } from "react";
import AgentCard, { timeAgo, type Agent, type Heartbeat } from "./AgentCard";

type AgentsResponse = {
  agents: Agent[];
  log: Heartbeat[];
  generatedAt: string;
};

export default function AgentsPage() {
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/agents");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load agents");
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const agents = data?.agents ?? [];
  const log = data?.log ?? [];
  const okCount = agents.filter((a) => a.state === "ok").length;
  const hasProblem = agents.some((a) => a.state === "failed" || a.state === "stale");
  const latestTs = log[0]?.ts ?? null;
  const scheduled = agents.filter((a) => a.kind === "scheduled");
  const onDemand = agents.filter((a) => a.kind === "on-demand");

  return (
    <div className="p-4 sm:p-8 max-w-3xl flex flex-col gap-8">
      <div>
        <p className="font-mono text-accent text-xs tracking-widest uppercase mb-3">
          Agentic OS · Mission Control
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
        <p className="font-mono text-sm text-muted mt-2 flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full animate-pulse ${
              hasProblem ? "bg-red-400" : "bg-emerald-400"
            }`}
          />
          {loading
            ? "connecting…"
            : error
              ? "offline"
              : `${agents.length} agents · ${okCount} ok · last activity ${timeAgo(latestTs)}`}
        </p>
      </div>

      {error && (
        <div className="border border-red-800/40 rounded-xl p-4 bg-red-950/20">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse bg-card/40 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <section>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
              Scheduled
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {scheduled.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </section>

          <section>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
              On-Demand
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {onDemand.map((a) => (
                <AgentCard key={a.id} agent={a} />
              ))}
            </div>
          </section>

          <section>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
              Activity
            </p>
            {log.length === 0 ? (
              <div className="rounded-lg border border-border bg-sidebar p-10 text-center">
                <p className="text-sm text-muted italic">
                  no activity yet — run an agent.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-xl bg-sidebar divide-y divide-border overflow-hidden">
                {log.map((entry, i) => (
                  <div
                    key={`${entry.ts}-${i}`}
                    className="font-mono text-xs flex items-center gap-3 px-4 py-2"
                  >
                    <span className="text-muted/70 shrink-0 w-16">
                      {timeAgo(entry.ts)}
                    </span>
                    <span className="text-accent shrink-0 w-16 truncate">
                      {entry.agent}
                    </span>
                    <span
                      className={`shrink-0 ${
                        entry.status === "ok" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {entry.status === "ok" ? "✓" : "✕"}
                    </span>
                    <span className="text-muted truncate">{entry.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
