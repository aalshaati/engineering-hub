import type { Project } from "./page";

const statusConfig: Record<
  Project["status"],
  { label: string; className: string }
> = {
  planning: {
    label: "Planning",
    className: "text-zinc-400 bg-zinc-800 border-zinc-700",
  },
  "in-progress": {
    label: "In Progress",
    className: "text-cyan-300 bg-cyan-950/40 border-cyan-800/50",
  },
  complete: {
    label: "Complete",
    className: "text-emerald-400 bg-emerald-950/40 border-emerald-800/50",
  },
};

type Props = {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
};

export default function ProjectCard({ project, onEdit, onDelete }: Props) {
  const { label, className } = statusConfig[project.status];

  return (
    <div className="rounded-lg border border-border bg-sidebar p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-accent text-xs">◧</span>
          <h3 className="text-sm font-semibold">{project.name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`font-mono text-xs px-2 py-0.5 rounded border ${className}`}
          >
            {label}
          </span>
          <button
            onClick={() => onEdit(project)}
            aria-label="Edit project"
            className="font-mono text-xs text-muted hover:text-foreground transition-colors"
          >
            edit
          </button>
          <button
            onClick={() => onDelete(project.id)}
            aria-label="Delete project"
            className="font-mono text-xs text-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-muted leading-relaxed">{project.description}</p>
      )}

      {project.components.length > 0 && (
        <div>
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
            Components
          </p>
          <div className="flex flex-wrap gap-1.5">
            {project.components.map((c) => (
              <span
                key={c}
                className="font-mono text-xs px-2 py-0.5 rounded border border-border text-muted"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
