"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricEntry = { timestamp: string; [key: string]: unknown };
type MealEntry = { timestamp: string; meal: string; calories: number; notes: string };
type HealthData = { metrics: MetricEntry[]; meals: MealEntry[] };

type TodayMetrics = {
  steps: number | null;
  heartRate: number | null;
  sleep: number | null;
  calories: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(ts: string) {
  return new Date(ts).toDateString() === new Date().toDateString();
}

function extractTodayMetrics(metrics: MetricEntry[]): TodayMetrics {
  const todayEntries = metrics.filter((m) => isToday(m.timestamp));
  if (!todayEntries.length) return { steps: null, heartRate: null, sleep: null, calories: null };
  const latest = todayEntries[todayEntries.length - 1];
  return {
    steps:
      (latest.steps as number) ??
      (latest.stepCount as number) ??
      (latest.HKQuantityTypeIdentifierStepCount as number) ??
      null,
    heartRate:
      (latest.heartRate as number) ??
      (latest.heart_rate as number) ??
      (latest.HKQuantityTypeIdentifierHeartRate as number) ??
      null,
    sleep:
      (latest.sleep as number) ??
      (latest.sleepHours as number) ??
      (latest.sleepAnalysis as number) ??
      (latest.HKCategoryTypeIdentifierSleepAnalysis as number) ??
      null,
    calories:
      (latest.activeEnergyBurned as number) ??
      (latest.calories as number) ??
      (latest.HKQuantityTypeIdentifierActiveEnergyBurned as number) ??
      null,
  };
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
    <div className="border border-border rounded-xl p-5 bg-sidebar flex flex-col gap-2">
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
  const fetchCount = useRef(0);

  async function loadData() {
    try {
      const res = await fetch("/api/health/data");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealthData(data);
    } catch {
      setHealthData({ metrics: [], meals: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fetchCount.current === 0) {
      fetchCount.current++;
      loadData();
    }
  }, []);

  const todayMetrics = healthData ? extractTodayMetrics(healthData.metrics) : null;
  const todayMeals = healthData
    ? healthData.meals.filter((m) => isToday(m.timestamp))
    : [];

  return (
    <div className="p-8 max-w-3xl flex flex-col gap-8">
      {/* Header */}
      <div>
        <p className="font-mono text-accent text-xs tracking-widest uppercase mb-3">
          ♡ Health
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Health Tracking</h1>
        <p className="font-mono text-sm text-muted">Apple Health metrics and nutrition</p>
      </div>

      {/* Today's metric cards */}
      <div>
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">Today</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Steps"
            value={todayMetrics?.steps ?? null}
            unit="steps"
            icon="◎"
            loading={loading}
          />
          <MetricCard
            label="Heart Rate"
            value={todayMetrics?.heartRate ?? null}
            unit="bpm"
            icon="♡"
            loading={loading}
          />
          <MetricCard
            label="Sleep"
            value={todayMetrics?.sleep ?? null}
            unit="hrs"
            icon="◻"
            loading={loading}
          />
          <MetricCard
            label="Calories"
            value={todayMetrics?.calories ?? null}
            unit="kcal"
            icon="◆"
            loading={loading}
          />
        </div>
      </div>

      {/* Meal logger */}
      <MealLogger todayMeals={todayMeals} onLogged={loadData} />

      {/* AI Insights */}
      <InsightsPanel />
    </div>
  );
}
