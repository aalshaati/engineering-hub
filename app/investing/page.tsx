"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sentiment = "positive" | "negative" | "neutral";
type Verdict = "hold" | "watch" | "sell";
type RiskLevel = "low" | "medium" | "high";
type Tab = "news" | "suggestions" | "health" | "holdings";

type NewsItem = {
  ticker: string;
  sentiment: Sentiment;
  headline: string;
  why: string;
  source: string;
  time: string;
};

type Suggestion = {
  ticker: string;
  name: string;
  riskLevel: RiskLevel;
  rationale: string;
  halalReason: string;
  pros: string[];
  cons: string[];
};

type HealthItem = {
  ticker: string;
  verdict: Verdict;
  summary: string;
  pros: string[];
  cons: string[];
  source: string;
};

type Holding = {
  ticker: string;
  shares: number;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ResearchContext = {
  ticker: string;
  topic: string;
  initialQuery: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_HOLDINGS: Holding[] = [
  { ticker: "SPUS", shares: 82.75 },
  { ticker: "UMMA", shares: 59.92 },
  { ticker: "NVDA", shares: 2.51 },
  { ticker: "TSM", shares: 0.9 },
  { ticker: "LLY", shares: 0.061471 },
  { ticker: "JNJ", shares: 1.03 },
  { ticker: "AMZN", shares: 1.02 },
  { ticker: "AVGO", shares: 0.697949 },
];

const TABS: { id: Tab; label: string }[] = [
  { id: "news", label: "TODAY'S NEWS" },
  { id: "suggestions", label: "SUGGESTIONS" },
  { id: "health", label: "HEALTH CHECK" },
  { id: "holdings", label: "MY HOLDINGS" },
];

// ─── Badge components ─────────────────────────────────────────────────────────

function TickerBadge({ ticker }: { ticker: string }) {
  return (
    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-accent border border-cyan-800/40">
      {ticker}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const map: Record<Sentiment, string> = {
    positive: "bg-green-950/50 text-green-400 border-green-800/40",
    negative: "bg-red-950/50 text-red-400 border-red-800/40",
    neutral: "bg-zinc-800/80 text-zinc-400 border-zinc-700/40",
  };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded-full border ${map[sentiment]}`}>
      {sentiment}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const map: Record<Verdict, string> = {
    hold: "bg-green-950/50 text-green-400 border-green-800/40",
    watch: "bg-amber-950/50 text-amber-400 border-amber-800/40",
    sell: "bg-red-950/50 text-red-400 border-red-800/40",
  };
  return (
    <span className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${map[verdict]}`}>
      {verdict.toUpperCase()}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    low: "text-green-400 border-green-800/40",
    medium: "text-amber-400 border-amber-800/40",
    high: "text-red-400 border-red-800/40",
  };
  return (
    <span className={`font-mono text-xs px-2 py-0.5 rounded border ${map[level]}`}>
      {level} risk
    </span>
  );
}

function HalalBadge() {
  return (
    <span className="font-mono text-xs px-2 py-0.5 rounded border bg-emerald-950/50 text-emerald-400 border-emerald-800/40">
      ☽ halal
    </span>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-zinc-800/60 rounded animate-pulse ${className}`} />;
}

function NewsSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border border-border rounded-xl p-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border rounded-xl p-5 flex flex-col gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

// ─── News tab ─────────────────────────────────────────────────────────────────

function NewsTab({
  data,
  loading,
  error,
}: {
  data: NewsItem[];
  loading: boolean;
  error: string;
}) {
  if (loading) return <NewsSkeletons />;
  if (error)
    return (
      <div className="border border-red-800/40 rounded-xl p-4 bg-red-950/20">
        <p className="font-mono text-xs text-red-400">{error}</p>
      </div>
    );
  if (!data.length)
    return <p className="text-muted text-sm">No news found for your holdings.</p>;

  return (
    <div className="flex flex-col gap-3">
      {data.map((item, i) => (
        <div
          key={i}
          className="border border-border rounded-xl p-4 bg-sidebar/40 hover:bg-sidebar/70 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <TickerBadge ticker={item.ticker} />
            <SentimentBadge sentiment={item.sentiment} />
            <span className="font-mono text-xs text-muted ml-auto">{item.time}</span>
          </div>
          <p className="text-sm font-medium leading-snug mb-1">{item.headline}</p>
          <p className="text-xs text-muted leading-relaxed mb-2">{item.why}</p>
          <p className="font-mono text-xs text-muted/60">via {item.source}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Suggestions tab ──────────────────────────────────────────────────────────

function SuggestionsTab({
  data,
  loading,
  error,
  onResearch,
}: {
  data: Suggestion[];
  loading: boolean;
  error: string;
  onResearch: (ctx: ResearchContext) => void;
}) {
  if (loading) return <CardSkeletons count={3} />;
  if (error)
    return (
      <div className="border border-red-800/40 rounded-xl p-4 bg-red-950/20">
        <p className="font-mono text-xs text-red-400">{error}</p>
      </div>
    );
  if (!data.length)
    return <p className="text-muted text-sm">No suggestions available.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.map((s, i) => (
        <div
          key={i}
          className="border border-border rounded-xl p-5 bg-sidebar/40 flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <TickerBadge ticker={s.ticker} />
            <HalalBadge />
            <RiskBadge level={s.riskLevel} />
          </div>
          <div>
            <p className="font-semibold text-sm">{s.name}</p>
          </div>
          <p className="text-xs text-muted leading-relaxed">{s.rationale}</p>
          <div className="text-xs text-emerald-400/80 leading-relaxed border-t border-border pt-2">
            <span className="font-mono text-emerald-600 mr-1">☽</span>
            {s.halalReason}
          </div>
          <div className="flex flex-col gap-1 text-xs">
            {s.pros.map((p, j) => (
              <div key={j} className="flex gap-1.5 text-green-400/80">
                <span>+</span>
                <span>{p}</span>
              </div>
            ))}
            {s.cons.map((c, j) => (
              <div key={j} className="flex gap-1.5 text-red-400/80">
                <span>−</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              onResearch({
                ticker: s.ticker,
                topic: `${s.name} (${s.ticker}) — suggested halal growth stock`,
                initialQuery: `Tell me more about ${s.ticker} — ${s.name}. Is it a good halal investment for a passive growth investor? Include recent financials, growth catalysts, and any risks I should know about.`,
              })
            }
            className="mt-auto w-full py-2 text-xs font-mono font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-foreground border border-border transition-colors"
          >
            Research this →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Health check tab ─────────────────────────────────────────────────────────

function HealthTab({
  data,
  loading,
  error,
  onAskMore,
}: {
  data: HealthItem[];
  loading: boolean;
  error: string;
  onAskMore: (ctx: ResearchContext) => void;
}) {
  if (loading) return <CardSkeletons count={4} />;
  if (error)
    return (
      <div className="border border-red-800/40 rounded-xl p-4 bg-red-950/20">
        <p className="font-mono text-xs text-red-400">{error}</p>
      </div>
    );
  if (!data.length)
    return <p className="text-muted text-sm">No health data available.</p>;

  return (
    <div className="flex flex-col gap-3">
      {data.map((h, i) => (
        <div
          key={i}
          className="border border-border rounded-xl p-4 bg-sidebar/40 hover:bg-sidebar/70 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <TickerBadge ticker={h.ticker} />
            <VerdictBadge verdict={h.verdict} />
            <span className="font-mono text-xs text-muted ml-auto">via {h.source}</span>
          </div>
          <p className="text-sm leading-relaxed mb-3">{h.summary}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
            {h.pros.map((p, j) => (
              <div key={j} className="flex gap-1.5 text-green-400/80">
                <span className="shrink-0">+</span>
                <span>{p}</span>
              </div>
            ))}
            {h.cons.map((c, j) => (
              <div key={j} className="flex gap-1.5 text-red-400/80">
                <span className="shrink-0">−</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              onAskMore({
                ticker: h.ticker,
                topic: `${h.ticker} — current verdict: ${h.verdict.toUpperCase()}`,
                initialQuery: `I want to dig deeper into ${h.ticker}. The current verdict is ${h.verdict.toUpperCase()}. ${h.summary} What should I be watching most closely?`,
              })
            }
            className="font-mono text-xs text-accent hover:text-cyan-300 transition-colors"
          >
            Ask more →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Holdings tab ─────────────────────────────────────────────────────────────

function HoldingsTab({
  holdings,
  onChange,
}: {
  holdings: Holding[];
  onChange: (h: Holding[]) => void;
}) {
  const [newTicker, setNewTicker] = useState("");
  const [newShares, setNewShares] = useState("");

  function updateShares(ticker: string, value: string) {
    const shares = parseFloat(value);
    if (isNaN(shares) || shares < 0) return;
    onChange(holdings.map((h) => (h.ticker === ticker ? { ...h, shares } : h)));
  }

  function remove(ticker: string) {
    onChange(holdings.filter((h) => h.ticker !== ticker));
  }

  function add() {
    const t = newTicker.trim().toUpperCase();
    const s = parseFloat(newShares);
    if (!t || isNaN(s) || s < 0) return;
    if (holdings.find((h) => h.ticker === t)) return;
    onChange([...holdings, { ticker: t, shares: s }]);
    setNewTicker("");
    setNewShares("");
  }

  function reset() {
    onChange(DEFAULT_HOLDINGS);
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/60">
              <th className="text-left px-4 py-2.5 font-mono text-xs text-muted">TICKER</th>
              <th className="text-left px-4 py-2.5 font-mono text-xs text-muted">SHARES</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr key={h.ticker} className="border-b border-border last:border-0 hover:bg-sidebar/40">
                <td className="px-4 py-2.5">
                  <TickerBadge ticker={h.ticker} />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={h.shares}
                    onChange={(e) => updateShares(h.ticker, e.target.value)}
                    className="w-28 bg-transparent border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-cyan-400/60"
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => remove(h.ticker)}
                    className="font-mono text-xs text-muted hover:text-red-400 transition-colors"
                  >
                    remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="TICKER"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className="w-24 bg-sidebar border border-border rounded-lg px-3 py-2 text-sm font-mono uppercase text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60"
        />
        <input
          type="number"
          step="any"
          min="0"
          placeholder="Shares"
          value={newShares}
          onChange={(e) => setNewShares(e.target.value)}
          className="w-32 bg-sidebar border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60"
        />
        <button
          onClick={add}
          disabled={!newTicker.trim() || !newShares}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-black hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      <button
        onClick={reset}
        className="font-mono text-xs text-muted hover:text-foreground transition-colors self-start"
      >
        ↺ reset to defaults
      </button>
    </div>
  );
}

// ─── Research panel ───────────────────────────────────────────────────────────

function ResearchPanel({
  context,
  open,
  onClose,
}: {
  context: ResearchContext | null;
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && context?.initialQuery) {
      setMessages([]);
      setError("");
      sendMessage(context.initialQuery, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context?.ticker]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string, history: ChatMessage[]) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    const updatedHistory = [...history, userMsg];
    setMessages([...updatedHistory, assistantMsg]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/investing/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (fullText.startsWith("__ERROR__:")) {
          throw new Error(fullText.replace("__ERROR__: ", ""));
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          };
          return updated;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Could not reach Claude. Check your API key.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const currentMessages = messages.filter((m) => m.content !== "");
    sendMessage(input.trim(), currentMessages);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-sidebar border-l border-border flex flex-col z-40 transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <p className="font-mono text-accent text-xs tracking-widest uppercase">Research</p>
            {context && (
              <p className="text-sm font-medium truncate mt-0.5">{context.topic}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="font-mono text-lg text-muted hover:text-foreground transition-colors px-2"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-zinc-800/80 border border-border rounded-tl-sm"
                    : "bg-zinc-900 border border-border rounded-tr-sm"
                }`}
              >
                {m.content}
                {m.role === "assistant" && isLoading && m.content === "" && (
                  <span className="font-mono text-muted animate-pulse">thinking...</span>
                )}
              </div>
            </div>
          ))}
          {error && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2">
              <p className="font-mono text-xs text-red-400">{error}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-border shrink-0 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up..."
            disabled={isLoading}
            className="flex-1 bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 text-xs bg-accent text-black font-medium rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "→"}
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvestingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("news");

  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState("");
  const newsFetched = useRef(false);

  const [suggestionsData, setSuggestionsData] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState("");
  const suggestionsFetched = useRef(false);

  const [healthData, setHealthData] = useState<HealthItem[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");
  const healthFetched = useRef(false);

  const [holdings, setHoldings] = useState<Holding[]>(DEFAULT_HOLDINGS);

  const [researchOpen, setResearchOpen] = useState(false);
  const [researchContext, setResearchContext] = useState<ResearchContext | null>(null);

  // Load holdings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("investing-holdings");
      if (stored) setHoldings(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist holdings to localStorage
  useEffect(() => {
    localStorage.setItem("investing-holdings", JSON.stringify(holdings));
  }, [holdings]);

  // Fetch news when tab is first opened
  useEffect(() => {
    if (activeTab === "news" && !newsFetched.current) {
      newsFetched.current = true;
      setNewsLoading(true);
      setNewsError("");
      fetch("/api/investing/news")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setNewsData(Array.isArray(data) ? data : []);
        })
        .catch((e) => setNewsError(e.message || "Failed to load news"))
        .finally(() => setNewsLoading(false));
    }
  }, [activeTab]);

  // Fetch suggestions when tab is first opened
  useEffect(() => {
    if (activeTab === "suggestions" && !suggestionsFetched.current) {
      suggestionsFetched.current = true;
      setSuggestionsLoading(true);
      setSuggestionsError("");
      fetch("/api/investing/suggestions")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setSuggestionsData(Array.isArray(data) ? data : []);
        })
        .catch((e) => setSuggestionsError(e.message || "Failed to load suggestions"))
        .finally(() => setSuggestionsLoading(false));
    }
  }, [activeTab]);

  // Fetch health when tab is first opened
  useEffect(() => {
    if (activeTab === "health" && !healthFetched.current) {
      healthFetched.current = true;
      setHealthLoading(true);
      setHealthError("");
      fetch("/api/investing/health")
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setHealthData(Array.isArray(data) ? data : []);
        })
        .catch((e) => setHealthError(e.message || "Failed to load health data"))
        .finally(() => setHealthLoading(false));
    }
  }, [activeTab]);

  const openResearch = useCallback((ctx: ResearchContext) => {
    setResearchContext(ctx);
    setResearchOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border shrink-0">
        <p className="font-mono text-accent text-xs tracking-widest uppercase mb-2">
          ◆ Portfolio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Investing</h1>
        <p className="text-sm text-muted mt-1">Halal portfolio dashboard</p>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-border shrink-0">
        <div className="flex gap-0 -mb-px">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`font-mono text-xs tracking-wider px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {activeTab === "news" && (
          <NewsTab data={newsData} loading={newsLoading} error={newsError} />
        )}
        {activeTab === "suggestions" && (
          <SuggestionsTab
            data={suggestionsData}
            loading={suggestionsLoading}
            error={suggestionsError}
            onResearch={openResearch}
          />
        )}
        {activeTab === "health" && (
          <HealthTab
            data={healthData}
            loading={healthLoading}
            error={healthError}
            onAskMore={openResearch}
          />
        )}
        {activeTab === "holdings" && (
          <HoldingsTab holdings={holdings} onChange={setHoldings} />
        )}
      </div>

      {/* Research panel */}
      <ResearchPanel
        context={researchContext}
        open={researchOpen}
        onClose={() => setResearchOpen(false)}
      />
    </div>
  );
}
