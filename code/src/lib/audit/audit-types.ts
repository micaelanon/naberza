// Audit event types — shared across all modules that emit audit events

export type AuditActor = "user" | "system" | "automation" | "integration";
export type AuditStatus = "success" | "failure" | "pending";

export interface AuditEntry {
  id: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actor: AuditActor;
  actorDetail?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: AuditStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAuditEntry {
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  actor: AuditActor;
  actorDetail?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: AuditStatus;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryParams {
  module?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actor?: AuditActor;
  status?: AuditStatus;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
