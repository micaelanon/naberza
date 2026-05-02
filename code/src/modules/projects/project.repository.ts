import { prisma } from "@/lib/db";
import type { Project, ProjectNote } from "@prisma/client";
import type { CreateProjectInput, UpdateProjectInput } from "./project.types";

export type ProjectWithNotes = Project & { notes: ProjectNote[] };

export class ProjectRepository {
  async findById(id: string): Promise<ProjectWithNotes | null> {
    return prisma.project.findUnique({ where: { id }, include: { notes: { orderBy: { createdAt: "desc" } } } });
  }

  async list(): Promise<ProjectWithNotes[]> {
    return prisma.project.findMany({ orderBy: { createdAt: "desc" }, include: { notes: { orderBy: { createdAt: "desc" } } } });
  }

  async create(input: CreateProjectInput): Promise<ProjectWithNotes> {
    return prisma.project.create({
      data: { name: input.name, description: input.description, tags: input.tags ?? [], startedAt: input.startedAt, dueAt: input.dueAt },
      include: { notes: true },
    });
  }

  async update(id: string, input: UpdateProjectInput): Promise<ProjectWithNotes> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.startedAt !== undefined) data.startedAt = input.startedAt;
    if (input.dueAt !== undefined) data.dueAt = input.dueAt;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;
    return prisma.project.update({ where: { id }, data: data as never, include: { notes: true } });
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async addNote(projectId: string, body: string): Promise<void> {
    await prisma.projectNote.create({ data: { projectId, body } });
  }

  async deleteNote(noteId: string): Promise<void> {
    await prisma.projectNote.delete({ where: { id: noteId } });
  }
}
