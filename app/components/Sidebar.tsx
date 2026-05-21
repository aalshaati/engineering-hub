"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: "◈" },
  { label: "Projects", href: "/projects", icon: "◧" },
  { label: "Notes", href: "/notes", icon: "◻" },
  { label: "Chat", href: "/chat", icon: "◎" },
  { label: "Investing", href: "/investing", icon: "◆" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-sidebar">
      <div className="px-5 py-5 border-b border-border">
        <span className="font-mono text-accent text-xs tracking-widest uppercase">
          ⬡ Eng Hub
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-foreground"
                  : "text-muted hover:text-foreground hover:bg-zinc-800/60"
              }`}
            >
              <span className="font-mono text-accent text-xs">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="font-mono text-xs text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
