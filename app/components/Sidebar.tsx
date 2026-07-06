"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: "◈" },
  { label: "Projects", href: "/projects", icon: "◧" },
  { label: "Agents", href: "/agents", icon: "⬢" },
  { label: "Notes", href: "/notes", icon: "◻" },
  { label: "Chat", href: "/chat", icon: "◎" },
  { label: "Investing", href: "/investing", icon: "◆" },
  { label: "Health", href: "/health", icon: "♡" },
];

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
      <rect y="2" width="18" height="2" rx="1" />
      <rect y="8" width="18" height="2" rx="1" />
      <rect y="14" width="18" height="2" rx="1" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") ?? "dark") as "dark" | "light";
    setTheme(saved);
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("light", next === "light");
    localStorage.setItem("theme", next);
  }

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="fixed top-0 inset-x-0 h-14 z-30 md:hidden flex items-center justify-between px-4 bg-sidebar border-b border-border">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-md text-muted hover:text-foreground transition-colors"
          aria-label="Open navigation"
        >
          <HamburgerIcon />
        </button>
        <span className="font-mono text-accent text-xs tracking-widest uppercase">⬡ Eng Hub</span>
        <button
          onClick={toggleTheme}
          className="p-2 -mr-2 rounded-md text-muted hover:text-foreground transition-colors text-base"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀" : "◑"}
        </button>
      </div>

      {/* ── Mobile backdrop ────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar panel ──────────────────────────────────────── */}
      <aside
        className={[
          "fixed md:relative inset-y-0 left-0 z-50 md:z-auto",
          "flex flex-col h-full shrink-0",
          "border-r border-border bg-sidebar",
          "transition-all duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-56",
          "w-64",
        ].join(" ")}
      >
        {/* Header */}
        <div
          className={[
            "flex items-center border-b border-border shrink-0 py-4",
            collapsed ? "md:justify-center px-0" : "justify-between px-4",
          ].join(" ")}
        >
          <span
            className={[
              "font-mono text-accent text-xs tracking-widest uppercase",
              collapsed ? "md:hidden" : "",
            ].join(" ")}
          >
            ⬡ Eng Hub
          </span>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-muted hover:text-foreground transition-colors text-lg leading-none"
            aria-label="Close navigation"
          >
            ✕
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={[
              "hidden md:flex items-center justify-center p-1 rounded",
              "text-muted hover:text-foreground transition-colors",
              collapsed ? "w-full" : "",
            ].join(" ")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="font-mono text-xs">{collapsed ? "→" : "←"}</span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  collapsed ? "md:justify-center" : "",
                  isActive
                    ? "bg-card text-foreground"
                    : "text-muted hover:text-foreground hover:bg-card/60",
                ].join(" ")}
              >
                <span className="font-mono text-accent text-xs shrink-0">{item.icon}</span>
                <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={[
            "px-3 py-3 border-t border-border shrink-0 flex items-center gap-2",
            collapsed ? "md:flex-col md:justify-center" : "justify-between",
          ].join(" ")}
        >
          {!collapsed && (
            <p className="font-mono text-xs text-muted hidden md:block">v0.1.0</p>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-muted hover:text-foreground transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="text-sm">{theme === "dark" ? "☀" : "◑"}</span>
            {!collapsed && (
              <span className="font-mono text-xs hidden md:inline">
                {theme === "dark" ? "light" : "dark"}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
