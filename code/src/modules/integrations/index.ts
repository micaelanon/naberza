// Integrations module — public interface

// Provider interfaces (contracts for all adapters)
export type * from "./providers";

// Adapter stubs (concrete implementations, Phase 2+)
export { PaperlessAdapter } from "./adapters/paperless";
export { HomeAssistantAdapter } from "./adapters/home-assistant";
export { ImapMailAdapter } from "./adapters/mail";
export { TelegramNotificationAdapter } from "./adapters/notifications";
export { NotImplementedError } from "./adapters/not-implemented-error";
