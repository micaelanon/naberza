import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  HomeEvent,
  CreateHomeEventInput,
  ListHomeEventsOptions,
} from "./home.types";

export class HomeRepository {
  async findById(id: string): Promise<HomeEvent | null> {
    return prisma.homeEvent.findUnique({ where: { id } });
  }

  async list(options: ListHomeEventsOptions = {}): Promise<HomeEvent[]> {
    return prisma.homeEvent.findMany({
      where: {
        ...(options.entityId ? { entityId: options.entityId } : {}),
        ...(options.severity ? { severity: options.severity } : {}),
        ...(options.acknowledged === true ? { acknowledgedAt: { not: null } } : {}),
        ...(options.acknowledged === false ? { acknowledgedAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  async count(options: Pick<ListHomeEventsOptions, "entityId" | "severity" | "acknowledged"> = {}): Promise<number> {
    return prisma.homeEvent.count({
      where: {
        ...(options.entityId ? { entityId: options.entityId } : {}),
        ...(options.severity ? { severity: options.severity } : {}),
        ...(options.acknowledged === true ? { acknowledgedAt: { not: null } } : {}),
        ...(options.acknowledged === false ? { acknowledgedAt: null } : {}),
      },
    });
  }

  async create(input: CreateHomeEventInput): Promise<HomeEvent> {
    return prisma.homeEvent.create({
      data: {
        eventType: input.eventType,
        entityId: input.entityId,
        state: input.state,
        previousState: input.previousState,
        attributes: input.attributes as Prisma.InputJsonValue | undefined,
        sourceConnectionId: input.sourceConnectionId,
        severity: input.severity ?? "INFO",
      },
    });
  }

  async acknowledge(id: string): Promise<HomeEvent> {
    return prisma.homeEvent.update({
      where: { id },
      data: { acknowledgedAt: new Date() },
    });
  }
}
