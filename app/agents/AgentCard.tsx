export type Heartbeat = {
  agent: string;
  status: "ok" | "failed";
  summary: string;
  ts: string;
};

export type Agent = {
  id: string;
  name: string;
  glyph: string;
  kind: "scheduled" | "on-demand";
  schedule: string;
  trigger: string;
  description: string;
  last: Heartbeat | null;
  state: "ok" | "failed" | "stale" | "never";
};

const stateConfig: Record<Agent["state"], { label: string; className: string }> = {
  ok: {
    label: "OK",
    className: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
  failed: {
    label: "FAILED",
    className: "text-red-400 bg-red-950/40 border-red-800/50",
  },
  stale: {
    label: "STALE",
    className: "text-amber-400 bg-amber-950/40 border-amber-800/50",
  },
  never: {
    label: "NEVER RAN",
    className: "text-zinc-400 bg-zinc-800 border-zinc-700",
  },
};

const kindConfig: Record<Agent["kind"], { label: string; className: string }> = {
  scheduled: {
    label: "SCHEDULED",
    className: "text-cyan-300 bg-cyan-950/40 border-cyan-800/50",
  },
  "on-demand": {
    label: "ON-DEMAND",
    className: "text-zinc-400 bg-zinc-800 border-zinc-700",
  },
};

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AgentCard({ agent }: { agent: Agent }) {
  const state = stateConfig[agent.state];
  const kind = kindConfig[agent.kind];

  return (
    <div className="border border-border rounded-xl p-4 sm:p-5 bg-sidebar flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-accent text-xs shrink-0">{agent.glyph}</span>
          <h3 className="text-sm font-semibold truncate">{agent.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`font-mono text-xs px-2 py-0.5 rounded border ${kind.className}`}>
            {kind.label}
          </span>
          <span className={`font-mono text-xs px-2 py-0.5 rounded border ${state.className}`}>
            {state.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted leading-relaxed">{agent.description}</p>

      <div className="flex flex-col gap-1.5 mt-auto">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted uppercase tracking-widest">
            {agent.schedule}
          </span>
          <span className="font-mono text-xs text-muted">
            last run {timeAgo(agent.last?.ts)}
          </span>
        </div>
        {agent.last?.summary && (
          <p className="font-mono text-xs text-muted leading-relaxed line-clamp-2">
            ▸ {agent.last.summary}
          </p>
        )}
        <p className="font-mono text-xs text-muted/70 truncate" title={agent.trigger}>
          {agent.trigger}
        </p>
      </div>
    </div>
  );
}
