"use client";

import { useState } from "react";
import type { Project } from "./page";

type Props = {
  project?: Project;
  onSave: (project: Project) => void;
  onClose: () => void;
};

export default function AddProjectModal({ project, onSave, onClose }: Props) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<Project["status"]>(project?.status ?? "planning");
  const [components, setComponents] = useState(project?.components.join(", ") ?? "");

  const isEditing = !!project;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: project?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      status,
      components: components
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      createdAt: project?.createdAt ?? new Date().toISOString(),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-sidebar border border-border rounded-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-sm font-semibold">
            {isEditing ? "Edit Project" : "New Project"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Raspberry Pi Weather Station"
              autoFocus
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of the project..."
              rows={3}
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Project["status"])}
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-cyan-400/60"
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted uppercase tracking-widest">
              Components
            </label>
            <input
              type="text"
              value={components}
              onChange={(e) => setComponents(e.target.value)}
              placeholder="RPi 4, OLED display, BME280 sensor"
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60"
            />
            <p className="text-xs text-muted">Separate with commas</p>
          </div>

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
              disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-cyan-400 text-black font-medium rounded-md hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEditing ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
