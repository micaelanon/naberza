import type { IntegrationStatus } from "@/app/integrations/api/status/route";

export type TabKey = "local" | "prod";

export type StatusMap = Partial<Record<string, IntegrationStatus>>;
