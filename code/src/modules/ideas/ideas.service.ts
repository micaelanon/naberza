import { eventBus } from "@/lib/events";
import type { IdeasRepository } from "./ideas.repository";
import type {
  Idea,
  IdeaSummary,
  CreateIdeaInput,
  UpdateIdeaInput,
  ListIdeasOptions,
} from "./ideas.types";

export class IdeasService {
  constructor(private readonly repository: IdeasRepository) {}

  async getIdea(id: string): Promise<Idea | null> {
    return this.repository.findById(id);
  }

  async listIdeas(options: ListIdeasOptions = {}): Promise<{
    items: IdeaSummary[];
    total: number;
  }> {
    const [ideas, total] = await Promise.all([
      this.repository.list(options),
      this.repository.count({
        status: options.status,
        search: options.search,
        tags: options.tags,
      }),
    ]);

    const items: IdeaSummary[] = ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      body: idea.body,
      tags: idea.tags,
      status: idea.status,
      promotedToModule: idea.promotedToModule,
      createdAt: idea.createdAt,
    }));

    return { items, total };
  }

  async createIdea(input: CreateIdeaInput): Promise<Idea> {
    const idea = await this.repository.create(input);

    await eventBus.emit("idea.created", {
      ideaId: idea.id,
      title: idea.title,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return idea;
  }

  async updateIdea(id: string, input: UpdateIdeaInput): Promise<Idea | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.update(id, input);
  }

  async promoteIdea(id: string, moduleId: string, entityId: string): Promise<Idea | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;

    const idea = await this.repository.promote(id, moduleId, entityId);

    await eventBus.emit("idea.promoted", {
      ideaId: idea.id,
      title: idea.title,
      targetModule: moduleId,
      targetEntityId: entityId,
      timestamp: new Date(),
      actor: { type: "system" },
    });

    return idea;
  }

  async archiveIdea(id: string): Promise<Idea | null> {
    const existing = await this.repository.findById(id);
    if (!existing) return null;
    return this.repository.archive(id);
  }

  async findByTag(tag: string): Promise<IdeaSummary[]> {
    const ideas = await this.repository.findByTag(tag);
    return ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      body: idea.body,
      tags: idea.tags,
      status: idea.status,
      promotedToModule: idea.promotedToModule,
      createdAt: idea.createdAt,
    }));
  }

  async getAllTags(): Promise<string[]> {
    return this.repository.getTags();
  }
}
