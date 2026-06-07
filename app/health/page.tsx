"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type MealEntry = { timestamp: string; meal: string; calories: number; notes: string };
type TodayMetrics = {
  steps: number | null;
  heartRate: number | null;
  sleep: number | null;
  calories_in: number | null;
  calories_burned: number | null;
  protein_g: number | null;
  weight_lb: number | null;
};
type HealthData = { todayMetrics: TodayMetrics; meals: MealEntry[] };
type WeightPoint = { date: string; weight_lb: number | null; avg?: number | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(ts: string) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

function addRollingAvg(points: { date: string; weight_lb: number | null }[]): WeightPoint[] {
  return points.map((p, i) => {
    const window = points
      .slice(Math.max(0, i - 6), i + 1)
      .filter((x) => x.weight_lb !== null);
    const avg =
      window.length >= 2
        ? Math.round((window.reduce((s, x) => s + x.weight_lb!, 0) / window.length) * 10) / 10
        : null;
    return { ...p, avg };
  });
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  unit,
  icon,
  loading,
}: {
  label: string;
  value: number | null;
  unit: string;
  icon: string;
  loading: boolean;
}) {
  return (
    <div className="border border-border rounded-xl p-4 sm:p-5 bg-sidebar flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-accent text-xs">{icon}</span>
        <span className="font-mono text-xs text-muted uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-card/60 rounded animate-pulse" />
      ) : value !== null ? (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight">
            {label === "Sleep"
              ? value.toFixed(1)
              : label === "Heart Rate"
              ? Math.round(value)
              : Math.round(value).toLocaleString()}
          </span>
          <span className="font-mono text-xs text-muted">{unit}</span>
        </div>
      ) : (
        <span className="text-xl font-mono text-muted">—</span>
      )}
    </div>
  );
}

// ─── Weight logger ────────────────────────────────────────────────────────────

function WeightLogger({
  todayWeight,
  onLogged,
}: {
  todayWeight: number | null;
  onLogged: () => void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/health/log-weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight_lb: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setValue("");
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log weight");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-border rounded-xl bg-sidebar overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">Morning Weight</p>
        {todayWeight !== null && (
          <span className="font-mono text-sm text-accent">{todayWeight} lb logged</span>
        )}
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-wrap gap-3 items-center">
        <input
          type="number"
          step="0.1"
          min="50"
          max="500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={todayWeight !== null ? `${todayWeight} (update)` : "lbs"}
          className="w-32 bg-card/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60"
        />
        <button
          type="submit"
          disabled={submitting || !value}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-black hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving..." : todayWeight !== null ? "Update" : "Log weight"}
        </button>
        {error && <p className="font-mono text-xs text-red-400">{error}</p>}
      </form>
    </div>
  );
}

// ─── Weight trend chart ───────────────────────────────────────────────────────

function WeightTrendChart({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<WeightPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/health/weight-history")
      .then((r) => r.json())
      .then((raw) => setData(addRollingAvg(raw)))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const hasData = data.some((d) => d.weight_lb !== null);

  if (loading) {
    return <div className="h-52 animate-pulse bg-card/40 rounded-xl" />;
  }

  if (!hasData) {
    return (
      <div className="border border-border rounded-xl p-5 bg-sidebar">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">Weight Trend (30 days)</p>
        <p className="text-xs text-muted italic">No weight data yet — log your morning weight above.</p>
      </div>
    );
  }

  const weights = data.filter((d) => d.weight_lb !== null).map((d) => d.weight_lb as number);
  const yMin = Math.floor(Math.min(...weights) - 2);
  const yMax = Math.ceil(Math.max(...weights) + 2);

  return (
    <div className="border border-border rounded-xl p-4 sm:p-5 bg-sidebar">
      <p className="font-mono text-xs text-muted uppercase tracking-widest mb-4">Weight Trend (30 days)</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            tickFormatter={(d: string) => d.slice(5)}
            stroke="rgba(255,255,255,0.15)"
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            stroke="rgba(255,255,255,0.15)"
            width={38}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
            formatter={(v: unknown, name?: string | number) => [
              v !== null ? `${v} lb` : "—",
              name === "weight_lb" ? "Weight" : "7-day avg",
            ]}
          />
          <Line
            type="monotone"
            dataKey="weight_lb"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={{ r: 3, fill: "#22d3ee", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            name="weight_lb"
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#22d3ee"
            strokeWidth={1}
            strokeOpacity={0.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls={false}
            name="avg"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-cyan-400" />
          <span className="font-mono text-xs text-muted">Daily</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-cyan-400 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(90deg, #22d3ee 0 4px, transparent 4px 7px)" }} />
          <span className="font-mono text-xs text-muted">7-day avg</span>
        </div>
      </div>
    </div>
  );
}

// ─── Meal logger ──────────────────────────────────────────────────────────────

function MealLogger({
  todayMeals,
  onLogged,
}: {
  todayMeals: MealEntry[];
  onLogged: () => void;
}) {
  const [meal, setMeal] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meal.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/health/log-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: meal.trim(), calories, notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMeal("");
      setCalories("");
      setNotes("");
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log meal");
    } finally {
      setSubmitting(false);
    }
  }

  const lastFive = todayMeals.slice(-5).reverse();

  return (
    <div className="border border-border rounded-xl bg-sidebar overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">Meal Logger</p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3 border-b border-border">
        <div className="flex gap-3">
          <input
            value={meal}
            onChange={(e) => setMeal(e.target.value)}
            placeholder="Meal name"
            required
            className="flex-1 bg-card/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60"
          />
          <input
            type="number"
            min="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="kcal"
            className="w-24 bg-card/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60"
          />
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="bg-card/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/60"
        />
        {error && <p className="font-mono text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !meal.trim()}
          className="self-start px-4 py-2 text-sm font-medium rounded-lg bg-accent text-black hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Logging..." : "Log meal"}
        </button>
      </form>

      {lastFive.length > 0 && (
        <div className="px-5 py-4 flex flex-col gap-2">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-1">Today&apos;s meals</p>
          {lastFive.map((m, i) => (
            <div key={i} className="flex items-baseline gap-3 text-sm">
              <span className="flex-1 text-foreground">{m.meal}</span>
              {m.calories > 0 && (
                <span className="font-mono text-xs text-accent shrink-0">{m.calories} kcal</span>
              )}
              {m.notes && (
                <span className="text-xs text-muted truncate max-w-40">{m.notes}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {lastFive.length === 0 && (
        <div className="px-5 py-4">
          <p className="text-xs text-muted italic">No meals logged today.</p>
        </div>
      )}
    </div>
  );
}

// ─── Insights panel ───────────────────────────────────────────────────────────

function InsightsPanel() {
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  async function fetchInsights() {
    setLoading(true);
    setError("");
    setInsights("");
    setFetched(true);

    try {
      const res = await fetch("/api/health/insights", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        if (full.startsWith("__ERROR__:")) {
          throw new Error(full.replace("__ERROR__: ", ""));
        }
        setInsights(full);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Claude");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <p className="font-mono text-xs text-muted uppercase tracking-widest">AI Insights</p>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="font-mono text-xs px-3 py-1.5 rounded-lg border border-border bg-card/60 hover:border-accent/40 hover:bg-zinc-700 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Thinking..." : fetched ? "↺ Refresh" : "Get Insights →"}
        </button>
      </div>

      {error && (
        <div className="border border-red-800/40 rounded-xl p-4 bg-red-950/20">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {(insights || loading) && !error && (
        <div className="border border-border rounded-xl p-5 bg-sidebar">
          {insights ? (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{insights}</p>
          ) : (
            <p className="font-mono text-xs text-muted animate-pulse">Analyzing your health data...</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const fetchCount = useRef(0);

  async function loadData() {
    try {
      const res = await fetch("/api/health/data");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealthData(data);
    } catch {
      setHealthData({
        todayMetrics: {
          steps: null,
          heartRate: null,
          sleep: null,
          calories_in: null,
          calories_burned: null,
          protein_g: null,
          weight_lb: null,
        },
        meals: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function handleWeightLogged() {
    loadData();
    setChartRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    if (fetchCount.current === 0) {
      fetchCount.current++;
      loadData();
    }
  }, []);

  const todayMetrics = healthData?.todayMetrics ?? null;
  const todayMeals = healthData ? healthData.meals.filter((m) => isToday(m.timestamp)) : [];

  return (
    <div className="p-4 sm:p-8 max-w-3xl flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="font-mono text-accent text-xs tracking-widest uppercase mb-3">♡ Health</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Health Tracking</h1>
        <p className="font-mono text-sm text-muted">Apple Health metrics and nutrition</p>
      </div>

      {/* Today's metric cards */}
      <div>
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Today</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="Steps" value={todayMetrics?.steps ?? null} unit="steps" icon="◎" loading={loading} />
          <MetricCard label="Calories In" value={todayMetrics?.calories_in ?? null} unit="kcal" icon="◆" loading={loading} />
          <MetricCard label="Protein" value={todayMetrics?.protein_g ?? null} unit="g" icon="◉" loading={loading} />
          <MetricCard label="Calories Burned" value={todayMetrics?.calories_burned ?? null} unit="kcal" icon="◈" loading={loading} />
          <MetricCard label="Sleep" value={todayMetrics?.sleep ?? null} unit="hrs" icon="◻" loading={loading} />
          <MetricCard label="Heart Rate" value={todayMetrics?.heartRate ?? null} unit="bpm" icon="♡" loading={loading} />
        </div>
      </div>

      {/* Weight logger */}
      <WeightLogger todayWeight={todayMetrics?.weight_lb ?? null} onLogged={handleWeightLogged} />

      {/* Weight trend chart */}
      <WeightTrendChart refreshKey={chartRefreshKey} />

      {/* Meal logger */}
      <MealLogger todayMeals={todayMeals} onLogged={loadData} />

      {/* AI Insights */}
      <InsightsPanel />
    </div>
  );
}
