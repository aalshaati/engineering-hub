"use client";

import { useEffect, useState } from "react";
import ProjectCard from "./ProjectCard";
import AddProjectModal from "./AddProjectModal";

export type Project = {
  id: string;
  name: string;
  description: string;
  status: "planning" | "in-progress" | "complete";
  components: string[];
  createdAt: string;
};

const STORAGE_KEY = "engineering-hub-projects";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch {
        // ignore malformed stored data
      }
    }
  }, []);

  function addProject(project: Project) {
    const next = [project, ...projects];
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updateProject(updated: Project) {
    const next = projects.map((p) => (p.id === updated.id ? updated : p));
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function deleteProject(id: string) {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-accent text-xs tracking-widest uppercase mb-2">
            Hardware Projects
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-400 text-black font-medium rounded-md hover:bg-cyan-300 transition-colors"
        >
          <span className="font-mono">+</span> Add Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-sidebar p-10 text-center">
          <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">
            No projects yet
          </p>
          <p className="text-sm text-muted">
            Add your first hardware project to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
              onDelete={deleteProject}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddProjectModal
          onSave={addProject}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingProject && (
        <AddProjectModal
          project={editingProject}
          onSave={updateProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}
