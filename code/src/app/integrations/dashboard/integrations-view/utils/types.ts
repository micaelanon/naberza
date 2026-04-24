import type { IntegrationStatus } from "../../../api/status/route";

export type TabKey = "local" | "prod";

export type StatusMap = Partial<Record<string, IntegrationStatus>>;
