import type { ProjectRepository, ProjectWithNotes } from "./project.repository";
import type { CreateProjectInput, UpdateProjectInput, ProjectSummary } from "./project.types";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async getProject(id: string): Promise<ProjectWithNotes | null> {
    return this.repository.findById(id);
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const projects = await this.repository.list();
    return projects.map((p) => ({
      id: p.id, name: p.name, description: p.description, status: p.status,
      tags: p.tags, startedAt: p.startedAt, dueAt: p.dueAt, completedAt: p.completedAt,
      notesCount: p.notes.length, createdAt: p.createdAt,
    }));
  }

  async createProject(input: CreateProjectInput): Promise<ProjectWithNotes> {
    return this.repository.create(input);
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<ProjectWithNotes | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.update(id, input);
  }

  async deleteProject(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error(`Project not found: ${id}`);
    await this.repository.delete(id);
  }

  async addNote(projectId: string, body: string): Promise<void> {
    await this.repository.addNote(projectId, body);
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.repository.deleteNote(noteId);
  }
}
