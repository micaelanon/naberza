import type { Project, ProjectNote, ProjectStatus } from "@prisma/client";
export type { Project, ProjectNote, ProjectStatus };
export type { Priority } from "@prisma/client";

export interface CreateProjectInput {
  name: string;
  description?: string;
  tags?: string[];
  startedAt?: Date;
  dueAt?: Date;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  tags?: string[];
  startedAt?: Date;
  dueAt?: Date;
  completedAt?: Date | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tags: string[];
  startedAt: Date | null;
  dueAt: Date | null;
  completedAt: Date | null;
  notesCount: number;
  createdAt: Date;
}
