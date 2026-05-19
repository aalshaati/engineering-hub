"use client";

import { useState } from "react";

const FOLDERS = [
  { id: "00_Daily_Notes", label: "Daily Notes" },
  { id: "01_Projects", label: "Projects" },
  { id: "02_Concepts", label: "Concepts" },
];

type Props = {
  onSaved: () => void;
  onClose: () => void;
};

export default function NewNoteModal({ onSaved, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("01_Projects");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), folder, content }),
      });

      if (!res.ok) throw new Error("Failed to save");

      onSaved();
      onClose();
    } catch {
      setError("Could not save note. Check the vault path.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-sidebar border border-border rounded-xl w-full max-w-lg">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-sm font-semibold">New Note</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Note"
              autoFocus
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Folder
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-400/60"
            >
              {FOLDERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id} — {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note in Markdown..."
              rows={8}
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60 resize-none font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-mono">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-4 py-2 text-sm bg-cyan-400 text-black font-medium rounded-md hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save to Vault"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
