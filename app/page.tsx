"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const features = [
  {
    label: "Hardware Projects",
    href: "/projects",
    description: "Track builds, components, and progress",
    icon: "◧",
  },
  {
    label: "Smart Notes",
    href: "/notes",
    description: "Create and browse Obsidian notes",
    icon: "◻",
  },
  {
    label: "AI Chat",
    href: "/chat",
    description: "Claude-powered engineering assistant",
    icon: "◎",
  },
];

export default function Home() {
  const [greeting, setGreeting] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
    setDate(formatDate());
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-10">
        <p className="font-mono text-accent text-xs tracking-widest uppercase mb-3">
          Daily Briefing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {greeting}, Abdulla.
        </h1>
        <p className="font-mono text-sm text-muted">{date}</p>
      </div>

      <div className="mb-8">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
          Hub
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group block p-4 rounded-lg border border-border bg-sidebar hover:border-accent/40 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-accent text-xs">{f.icon}</span>
                <span className="text-sm font-medium">{f.label}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {f.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-sidebar p-5">
        <p className="font-mono text-xs text-muted uppercase tracking-widest mb-3">
          Today&apos;s Focus
        </p>
        <p className="text-sm text-muted italic">
          No focus set — add one in your notes.
        </p>
      </div>
    </div>
  );
}
