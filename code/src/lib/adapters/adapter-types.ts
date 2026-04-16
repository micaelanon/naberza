// Shared types for all adapters and the adapter registry

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  message?: string;
  checkedAt: Date;
}

export type AdapterErrorCode =
  | "CONNECTION_FAILED"
  | "AUTH_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "EXTERNAL_ERROR"
  | "UNKNOWN";

export class AdapterError extends Error {
  constructor(
    public readonly code: AdapterErrorCode,
    message: string,
    public readonly originalError?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export type ConnectionType = "paperless" | "home_assistant" | "email_imap" | "email_webhook" | "api" | "custom";
export type ConnectionStatus = "active" | "inactive" | "error";

export interface ConnectionPermissions {
  read: boolean;
  write: boolean;
}

export interface ConnectionConfig {
  id: string;
  name: string;
  type: ConnectionType;
  status: ConnectionStatus;
  permissions: ConnectionPermissions;
  config: Record<string, unknown>;
  lastHealthCheck?: Date;
  lastError?: string;
}

/**
 * Base interface that all adapters must implement.
 * Specific adapters (DocumentProvider, HomeAutomationProvider, etc.)
 * extend this with their domain-specific methods.
 */
export interface BaseAdapter {
  readonly type: ConnectionType;
  readonly connectionId: string;
  testConnection(): Promise<HealthCheckResult>;
  dispose?(): void | Promise<void>;
}
