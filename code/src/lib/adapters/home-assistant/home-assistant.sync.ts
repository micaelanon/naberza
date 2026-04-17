import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";
import type { EventActor } from "@/lib/events";
import type { HomeAssistantAdapter, HaState } from "./home-assistant.adapter";

const SYSTEM_ACTOR: EventActor = { type: "system" };

export interface HaSyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

function buildEntityTitle(entityId: string): string {
  const parts = entityId.split(".");
  const name = parts[1] ?? parts[0] ?? entityId;
  const formatted = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `Alert: ${formatted}`;
}

function buildEntityBody(state: HaState): string {
  return `State: ${state.state}\nEntity: ${state.entity_id}\nLast changed: ${state.last_changed}`;
}

async function findExistingItem(externalId: string, connectionId: string): Promise<boolean> {
  const existing = await prisma.inboxItem.findFirst({
    where: { sourceExternalId: externalId, sourceConnectionId: connectionId },
    select: { id: true },
  });
  return existing !== null;
}

async function createInboxItem(
  state: HaState,
  connectionId: string
): Promise<void> {
  const externalId = `${state.entity_id}:${state.last_changed}`;

  const item = await prisma.inboxItem.create({
    data: {
      title: buildEntityTitle(state.entity_id),
      body: buildEntityBody(state),
      sourceType: "HOME_ASSISTANT",
      sourceConnectionId: connectionId,
      sourceExternalId: externalId,
      sourceRawPayload: state as never,
      status: "PENDING",
      classification: "ALERT",
      classifiedBy: "RULE",
      classificationConfidence: 0.85,
    },
  });

  await eventBus.emit("inbox.item.created", {
    timestamp: new Date(),
    actor: SYSTEM_ACTOR,
    itemId: item.id,
    title: item.title,
    sourceType: "HOME_ASSISTANT",
  });

  await eventBus.emit("inbox.item.classified", {
    timestamp: new Date(),
    actor: SYSTEM_ACTOR,
    itemId: item.id,
    title: item.title,
    sourceType: "HOME_ASSISTANT",
    classification: "ALERT",
    classifiedBy: "rule",
    confidence: 0.85,
  });
}

async function processEntity(
  state: HaState,
  adapter: HomeAssistantAdapter,
  result: HaSyncResult
): Promise<void> {
  try {
    const externalId = `${state.entity_id}:${state.last_changed}`;
    const exists = await findExistingItem(externalId, adapter.connectionId);
    if (exists) {
      result.skipped++;
      return;
    }
    await createInboxItem(state, adapter.connectionId);
    result.synced++;
  } catch {
    result.errors++;
  }
}

export async function syncHomeAssistantAlerts(
  adapter: HomeAssistantAdapter,
  options: { maxEntities?: number } = {}
): Promise<HaSyncResult> {
  const { maxEntities = 50 } = options;
  const result: HaSyncResult = { synced: 0, skipped: 0, errors: 0 };

  const allStates = await adapter.getStates();

  const monitoredDomains = adapter.getMonitoredDomains();
  const notableStates = allStates
    .filter((s) => monitoredDomains.includes(adapter.getDomain(s.entity_id)))
    .filter((s) => adapter.isNotableState(s))
    .slice(0, maxEntities);

  for (const state of notableStates) {
    await processEntity(state, adapter, result);
  }

  return result;
}
