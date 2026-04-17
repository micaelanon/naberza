// Notification contract types for the automations module.
// Notification adapters (Telegram, Email, etc.) implement NotificationChannel.

export interface NotificationPayload {
  subject: string;
  body: string;
  level: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  channelId: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export type NotificationEvent =
  | "approval.requested"
  | "approval.granted"
  | "approval.denied"
  | "rule.execution.failed"
  | "rule.anomaly.detected";

export interface NotificationSubscription {
  event: NotificationEvent;
  channelIds: string[];
}
