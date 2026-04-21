import {
  CleanupAction,
  CleanupMatchType,
  CreateCleanupRuleInput,
} from "./cleanup.types";

/**
 * Email-cleanup presets — curated, ready-to-use rules the user can enable in one click.
 *
 * Each preset maps directly to a {@link CreateCleanupRuleInput} so the backend can
 * persist it without any additional transformation.
 *
 * Keep the list short, opinionated and safe by default:
 *  - destructive presets (DELETE) should remain in `dryRunEnabled = true` mode
 *    so the user must explicitly opt-in to actually deleting mail.
 *  - names are Spanish-first, matching the Naberza UI language.
 */

export interface CleanupPreset {
  /** Stable identifier so the UI can track which presets a user has already applied. */
  id: string;
  /** Emoji shown in the UI */
  icon: string;
  /** Short human-readable name */
  name: string;
  /** One-line explanation of what the rule does */
  description: string;
  /** Category to group presets in the UI */
  category: "newsletter" | "social" | "notifications" | "promotions" | "maintenance" | "work";
  /** Safety level — helps the UI warn the user before enabling destructive rules */
  safety: "safe" | "moderate" | "destructive";
  /** The rule payload. `dryRunEnabled` defaults to true for safety. */
  rule: CreateCleanupRuleInput;
}

export const CLEANUP_PRESETS: CleanupPreset[] = [
  // ─────────────────────────── Newsletters ───────────────────────────
  {
    id: "newsletters-archive",
    icon: "📰",
    name: "Archivar boletines y newsletters",
    description: "Detecta boletines por cabecera List-Unsubscribe y palabras clave y los archiva.",
    category: "newsletter",
    safety: "safe",
    rule: {
      name: "Archivar boletines",
      description: "Archivado automático de boletines (vista previa primero)",
      matchType: CleanupMatchType.NEWSLETTER,
      config: {
        marketingKeywords: ["newsletter", "boletín", "boletin", "news"],
      },
      action: CleanupAction.ARCHIVE,
      dryRunEnabled: true,
    },
  },

  // ─────────────────────────── Promotions ────────────────────────────
  {
    id: "promos-delete",
    icon: "🛍️",
    name: "Eliminar promociones y ofertas",
    description: "Elimina emails con palabras tipo 'oferta', 'descuento', 'rebajas', '% off'.",
    category: "promotions",
    safety: "moderate",
    rule: {
      name: "Promociones y ofertas",
      description: "Limpieza de emails comerciales",
      matchType: CleanupMatchType.KEYWORD,
      config: {
        keywords: [
          "descuento",
          "oferta",
          "rebaja",
          "rebajas",
          "promoción",
          "promocion",
          "% off",
          "black friday",
          "cyber monday",
          "sale",
        ],
        searchIn: "both",
        matchAll: false,
        caseSensitive: false,
      },
      action: CleanupAction.DELETE,
      dryRunEnabled: true,
    },
  },

  // ─────────────────────────── Social networks ───────────────────────
  {
    id: "social-archive",
    icon: "👥",
    name: "Archivar notificaciones de redes sociales",
    description: "Archiva avisos de LinkedIn, Twitter/X, Facebook, Instagram y similares.",
    category: "social",
    safety: "safe",
    rule: {
      name: "Notificaciones de redes sociales",
      matchType: CleanupMatchType.SENDER,
      config: {
        senderEmails: [
          "@linkedin.com",
          "@facebookmail.com",
          "@twitter.com",
          "@x.com",
          "@instagram.com",
          "@tiktok.com",
          "@threads.net",
          "@youtube.com",
        ],
        matchType: "domain",
      },
      action: CleanupAction.ARCHIVE,
      dryRunEnabled: true,
    },
  },

  // ─────────────────────────── Dev tools / notifications ─────────────
  {
    id: "github-archive",
    icon: "🐙",
    name: "Archivar notificaciones de GitHub",
    description: "Archiva los correos automáticos de GitHub (notifications@github.com).",
    category: "notifications",
    safety: "safe",
    rule: {
      name: "Notificaciones de GitHub",
      matchType: CleanupMatchType.SENDER,
      config: {
        senderEmails: ["notifications@github.com", "noreply@github.com"],
        matchType: "exact",
      },
      action: CleanupAction.ARCHIVE,
      dryRunEnabled: true,
    },
  },

  // ─────────────────────────── Calendar / meetings ───────────────────
  {
    id: "calendar-archive",
    icon: "📅",
    name: "Archivar invitaciones y avisos de calendario",
    description: "Archiva emails de Google Calendar, Outlook y Zoom con recordatorios.",
    category: "notifications",
    safety: "safe",
    rule: {
      name: "Invitaciones y recordatorios",
      matchType: CleanupMatchType.SENDER,
      config: {
        senderEmails: [
          "calendar-notification@google.com",
          "no-reply@calendar.google.com",
          "@zoom.us",
          "@outlook.com",
        ],
        matchType: "domain",
      },
      action: CleanupAction.ARCHIVE,
      dryRunEnabled: true,
    },
  },

  // ─────────────────────────── Maintenance ───────────────────────────
  {
    id: "old-180",
    icon: "🗂️",
    name: "Archivar correos de más de 6 meses",
    description: "Archiva emails con más de 180 días, manteniendo tu bandeja limpia.",
    category: "maintenance",
    safety: "moderate",
    rule: {
      name: "Emails antiguos (+180 días)",
      matchType: CleanupMatchType.OLD_EMAILS,
      config: { ageInDays: 180 },
      action: CleanupAction.ARCHIVE,
      dryRunEnabled: true,
    },
  },
  {
    id: "old-365-delete",
    icon: "🧹",
    name: "Eliminar correos de más de 1 año",
    description: "Borra emails con más de 365 días. Requiere confirmación manual.",
    category: "maintenance",
    safety: "destructive",
    rule: {
      name: "Eliminar emails +1 año",
      matchType: CleanupMatchType.OLD_EMAILS,
      config: { ageInDays: 365 },
      action: CleanupAction.DELETE,
      dryRunEnabled: true, // Always ship destructive presets in dry-run
    },
  },

  // ─────────────────────────── Notifications misc ────────────────────
  {
    id: "noreply-archive",
    icon: "🤖",
    name: "Archivar correos de 'noreply@...'",
    description: "Archiva los remitentes automáticos tipo noreply@* y no-reply@*.",
    category: "notifications",
    safety: "safe",
    rule: {
      name: "Remitentes noreply",
      matchType: CleanupMatchType.KEYWORD,
      config: {
        // We use a keyword match in the sender-bearing header text; since we
        // don't have a dedicated sender-matcher for prefixes, this is a
        // pragmatic fallback that still catches noreply@ / no-reply@ in bodies.
        keywords: ["noreply@", "no-reply@"],
        searchIn: "both",
        caseSensitive: false,
      },
      action: CleanupAction.ARCHIVE,
      dryRunEnabled: true,
    },
  },
];

/**
 * Find a preset by id. Returns `undefined` if not known.
 */
export function getPresetById(id: string): CleanupPreset | undefined {
  return CLEANUP_PRESETS.find((p) => p.id === id);
}

/**
 * Group presets by category for easier rendering.
 */
export function groupPresetsByCategory(): Record<CleanupPreset["category"], CleanupPreset[]> {
  return CLEANUP_PRESETS.reduce(
    (acc, p) => {
      (acc[p.category] ||= []).push(p);
      return acc;
    },
    {} as Record<CleanupPreset["category"], CleanupPreset[]>
  );
}
