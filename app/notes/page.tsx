"use client";

import { useEffect, useState } from "react";
import NewNoteModal from "./NewNoteModal";

type Note = {
  name: string;
  file: string;
  folder: string;
  folderLabel: string;
  modifiedAt: string;
};

const TABS = [
  { id: "all", label: "All" },
  { id: "00_Daily_Notes", label: "Daily Notes" },
  { id: "01_Projects", label: "Projects" },
  { id: "02_Concepts", label: "Concepts" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotes();
  }, []);

  const filtered =
    activeTab === "all" ? notes : notes.filter((n) => n.folder === activeTab);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-accent text-xs tracking-widest uppercase mb-2">
            Obsidian Vault
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-400 text-black font-medium rounded-md hover:bg-cyan-300 transition-colors"
        >
          <span className="font-mono">+</span> New Note
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === tab.id
                ? "bg-zinc-800 text-foreground"
                : "text-muted hover:text-foreground hover:bg-zinc-800/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="font-mono text-xs text-muted">Loading vault...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
              No notes
            </p>
            <p className="text-sm text-muted">
              {activeTab === "all"
                ? "Your vault appears empty."
                : "No notes in this folder yet."}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((note, i) => (
              <li
                key={`${note.folder}/${note.file}`}
                className={`flex items-center justify-between px-4 py-3 gap-4 ${
                  i !== filtered.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-accent text-xs shrink-0">◻</span>
                  <span className="text-sm truncate">{note.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-xs text-muted hidden sm:block">
                    {note.folderLabel}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {formatDate(note.modifiedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <NewNoteModal
          onSaved={fetchNotes}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
