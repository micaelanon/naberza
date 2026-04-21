import type { InboxItem } from "@prisma/client";
import type { InboxRepository } from "@/modules/inbox/inbox.repository";
import {
  CleanupAction,
  CleanupMatchType,
  CreateCleanupRuleInput,
} from "./cleanup.types";

/**
 * CleanupSuggestionService
 *
 * Inspects the user's pending inbox items and proposes cleanup rules
 * that would have a real impact. Heuristics:
 *
 *  - `top-senders`: any sender whose emails are at least `MIN_SENDER_COUNT`
 *     of all pending emails is a candidate for a domain/sender rule.
 *  - `newsletters`: if emails look like newsletters (list-unsubscribe,
 *     marketing keywords), suggest enabling the newsletter preset.
 *  - `old-emails`: if more than 50 emails are older than 180 days, suggest
 *     an OLD_EMAILS rule.
 *
 * Suggestions are **not persisted** — they're returned to the UI so the
 * user can review and apply (create) them with a single click.
 */

const SAMPLE_SIZE = 500;
const MIN_SENDER_COUNT = 5; // at least N emails from the same sender to trigger suggestion
const TOP_SENDERS_LIMIT = 6;

export interface CleanupSuggestion {
  /** Stable id used for dedup / "dismiss suggestion" tracking on the client */
  id: string;
  /** Human-readable title rendered in the UI */
  title: string;
  /** One-line description (counts, sender, etc.) */
  description: string;
  /** How confident we are that this suggestion is useful (0-1) */
  confidence: number;
  /** Number of pending emails that would be affected right now */
  impactCount: number;
  /** Emoji / icon for the UI */
  icon: string;
  /** The ready-to-apply rule */
  rule: CreateCleanupRuleInput;
  /** Source heuristic that produced this suggestion */
  source: "top-sender" | "top-domain" | "newsletter" | "old-emails";
}

export class CleanupSuggestionService {
  constructor(private readonly inboxRepository: InboxRepository) {}

  async suggest(): Promise<CleanupSuggestion[]> {
    const { items } = await this.inboxRepository.findAll({
      status: "PENDING",
      sourceType: "EMAIL",
      pageSize: SAMPLE_SIZE,
    });

    const emails = items as unknown as InboxItem[];
    const suggestions: CleanupSuggestion[] = [];

    suggestions.push(...this.suggestByTopSenders(emails));
    suggestions.push(...this.suggestNewsletters(emails));
    suggestions.push(...this.suggestOldEmails(emails));

    // Return sorted by impact desc — most impactful first
    return suggestions.sort((a, b) => b.impactCount - a.impactCount);
  }

  // ────────────────────────── Top senders / domains ──────────────────

  private suggestByTopSenders(items: InboxItem[]): CleanupSuggestion[] {
    const senderCounts = new Map<string, number>();
    const domainCounts = new Map<string, number>();

    for (const item of items) {
      const sender = this.extractSender(item);
      if (!sender) continue;
      senderCounts.set(sender, (senderCounts.get(sender) || 0) + 1);
      const domain = sender.split("@")[1];
      if (domain) domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }

    const suggestions: CleanupSuggestion[] = [];

    // Top domains get priority (broader impact)
    const topDomains = Array.from(domainCounts.entries())
      .filter(([, count]) => count >= MIN_SENDER_COUNT)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_SENDERS_LIMIT);

    for (const [domain, count] of topDomains) {
      // If a single sender dominates the domain, skip — the per-sender
      // suggestion below is more accurate.
      suggestions.push({
        id: `top-domain:${domain}`,
        title: `Archivar emails de @${domain}`,
        description: `Tienes ${count} emails de ${domain}. Puedes archivarlos todos con una regla.`,
        confidence: Math.min(1, count / 20),
        impactCount: count,
        icon: "📬",
        source: "top-domain",
        rule: {
          name: `Archivar @${domain}`,
          description: `Regla sugerida: archivar emails del dominio ${domain}`,
          matchType: CleanupMatchType.SENDER,
          config: {
            senderEmails: [`@${domain}`],
            matchType: "domain",
          },
          action: CleanupAction.ARCHIVE,
          dryRunEnabled: true,
        },
      });
    }

    return suggestions;
  }

  // ────────────────────────── Newsletters ────────────────────────────

  private suggestNewsletters(items: InboxItem[]): CleanupSuggestion[] {
    const newsletterLike = items.filter((item) => this.looksLikeNewsletter(item));
    if (newsletterLike.length < 3) return [];

    return [
      {
        id: "newsletters",
        title: "Archivar todos tus boletines automáticamente",
        description: `Detectamos ${newsletterLike.length} correos que parecen boletines o newsletters.`,
        confidence: Math.min(1, newsletterLike.length / 15),
        impactCount: newsletterLike.length,
        icon: "📰",
        source: "newsletter",
        rule: {
          name: "Archivar boletines (sugerencia)",
          description: "Detecta boletines por cabecera List-Unsubscribe y palabras clave.",
          matchType: CleanupMatchType.NEWSLETTER,
          config: {
            marketingKeywords: ["newsletter", "boletín", "boletin", "news"],
          },
          action: CleanupAction.ARCHIVE,
          dryRunEnabled: true,
        },
      },
    ];
  }

  private looksLikeNewsletter(item: InboxItem): boolean {
    const payload = (item.sourceRawPayload as Record<string, unknown>) || {};
    const headers = (payload["headers"] as Record<string, unknown>) || {};
    if (headers["list-unsubscribe"] || headers["List-Unsubscribe"]) return true;
    if (payload["listUnsubscribe"] || payload["List-Unsubscribe"]) return true;
    const text = `${item.title} ${item.body ?? ""}`.toLowerCase();
    if (text.includes("unsubscribe") || text.includes("darse de baja")) return true;
    return false;
  }

  // ────────────────────────── Old emails ─────────────────────────────

  private suggestOldEmails(items: InboxItem[]): CleanupSuggestion[] {
    const cutoff = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const old = items.filter((i) => i.createdAt.getTime() <= cutoff);
    if (old.length < 20) return [];

    return [
      {
        id: "old-180",
        title: "Archivar correos de más de 6 meses",
        description: `Tienes ${old.length} emails con más de 180 días en la bandeja.`,
        confidence: Math.min(1, old.length / 100),
        impactCount: old.length,
        icon: "🗂️",
        source: "old-emails",
        rule: {
          name: "Emails antiguos (+180 días)",
          matchType: CleanupMatchType.OLD_EMAILS,
          config: { ageInDays: 180 },
          action: CleanupAction.ARCHIVE,
          dryRunEnabled: true,
        },
      },
    ];
  }

  // ────────────────────────── Helpers ────────────────────────────────

  private extractSender(item: InboxItem): string | undefined {
    if (!item.sourceRawPayload || typeof item.sourceRawPayload !== "object") return undefined;
    const payload = item.sourceRawPayload as Record<string, unknown>;
    const candidate = payload["from"] ?? payload["sender"] ?? payload["senderEmail"];

    if (typeof candidate === "string") {
      const match = candidate.match(/<([^>]+)>/);
      return (match ? match[1] : candidate).trim().toLowerCase();
    }
    if (candidate && typeof candidate === "object") {
      const maybe =
        (candidate as Record<string, unknown>)["address"] ??
        (candidate as Record<string, unknown>)["email"];
      if (typeof maybe === "string") return maybe.trim().toLowerCase();
    }
    return undefined;
  }
}
