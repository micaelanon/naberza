import { ROUTE_PATHS } from "@/lib/constants";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import type { InboxItem } from "@/modules/inbox/inbox.types";

export interface MailSuggestion {
  id: string;
  title: string;
  detail: string;
  kind: "newsletter" | "invoice" | "review" | "followup" | "sender" | "pattern";
  href: string;
}

export interface MailSenderGroup {
  sender: string;
  count: number;
  samples: string[];
}

export interface MailAnalysisResult {
  suggestions: MailSuggestion[];
  newsletters: MailSenderGroup[];
  reviewQueue: InboxItem[];
  probableInvoices: InboxItem[];
  topSenders: MailSenderGroup[];
  noisySenders: MailSenderGroup[];
}

const inboxRepo = new InboxRepository();

const TECHNICAL_SENDER_HINTS = [
  "github",
  "snyk",
  "vercel",
  "netlify",
  "jira",
  "atlassian",
  "linear",
  "notion",
  "docker",
  "npm",
  "buildkite",
  "circleci",
  "gitlab",
  "bitbucket",
];

const TECHNICAL_SUBJECT_HINTS = [
  "pull request",
  "pr #",
  "run failed",
  "workflow",
  "checks failed",
  "ci",
  "build failed",
  "deployment",
  "refactor(",
  "feat(",
  "fix(",
  "chore(",
  "re:",
  "[",
];

const INVOICE_KEYWORDS = [
  "factura",
  "invoice",
  "receipt",
  "recibo",
  "payment due",
  "importe",
  "total:",
  "vat",
  "iva",
  "due date",
  "fecha de vencimiento",
  "billing",
  "bill",
  "charged",
  "cargo",
];

const INVOICE_ATTACHMENTS_HINTS = [".pdf", "attachment", "adjunto"];
const INVOICE_NUMBER_HINTS = ["número de factura", "invoice #", "invoice number"];
const INVOICE_SENDER_HINTS = ["billing", "factura", "payments"];

const REVIEW_KEYWORDS = [
  "urgent",
  "importante",
  "acción requerida",
  "required",
  "bank",
  "seguro",
  "renovación",
  "caducar",
  "caduca",
  "tarjeta",
  "pago rechazado",
  "payment failed",
  "verifica",
  "verify",
  "suspensión",
  "account",
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function extractSender(body: string | null): string {
  if (!body) return "unknown";

  const fromLine = body
    .split("\n")
    .find((entry) => entry.trim().toLowerCase().startsWith("from:"));

  if (!fromLine) return "unknown";

  return fromLine.slice(fromLine.indexOf(":") + 1).trim() || "unknown";
}

function getSenderHaystack(item: InboxItem): string {
  return normalizeText(extractSender(item.body));
}

function getMailHaystack(item: InboxItem): string {
  return `${normalizeText(item.title)}\n${normalizeText(item.body)}`;
}

function hasAnyHint(haystack: string, hints: string[]): boolean {
  return hints.some((hint) => haystack.includes(hint));
}

function sanitizeUrlCandidate(value: string): string {
  const leading = new Set(["<", "(", '"', "'"]);
  const trailing = new Set([">", ")", ",", ".", '"', "'"]);

  let start = 0;
  let end = value.length;

  while (start < end && leading.has(value[start] ?? "")) start += 1;
  while (end > start && trailing.has(value[end - 1] ?? "")) end -= 1;

  return value.slice(start, end);
}

function containsUrlFromAllowedHost(text: string, allowedHost: string): boolean {
  const parts = text.split(/\s+/u);

  return parts.some((part) => {
    const candidate = sanitizeUrlCandidate(part);
    if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
      return false;
    }

    try {
      const hostname = new URL(candidate).hostname.toLowerCase();
      return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
    } catch {
      return false;
    }
  });
}

function looksTechnical(item: InboxItem): boolean {
  const sender = getSenderHaystack(item);
  const subject = normalizeText(item.title);
  const body = normalizeText(item.body);

  return hasAnyHint(sender, TECHNICAL_SENDER_HINTS)
    || hasAnyHint(subject, TECHNICAL_SUBJECT_HINTS)
    || body.includes("x-github")
    || containsUrlFromAllowedHost(body, "github.com")
    || body.includes("workflow run")
    || body.includes("pull request")
    || body.includes("commit")
    || body.includes("ci/cd");
}

function looksLikeNewsletter(item: InboxItem): boolean {
  const haystack = getMailHaystack(item);
  if (looksTechnical(item)) return false;

  return haystack.includes("unsubscribe")
    || haystack.includes("newsletter")
    || haystack.includes("view in browser")
    || haystack.includes("manage preferences")
    || haystack.includes("marketing")
    || haystack.includes("promoción")
    || haystack.includes("promo")
    || haystack.includes("unsubscribe from this")
    || haystack.includes("darse de baja");
}

function containsMonetaryAmount(text: string): boolean {
  return /\b\d+(?:[.,]\d{2})?\s?(?:eur|€|usd|\$)\b/iu.test(text);
}

function getInvoiceScore(item: InboxItem): number {
  if (looksTechnical(item)) return -10;

  const haystack = getMailHaystack(item);
  const sender = getSenderHaystack(item);
  const checks = [
    item.classification === "INVOICE" ? 3 : 0,
    hasAnyHint(haystack, INVOICE_KEYWORDS) ? 2 : 0,
    hasAnyHint(haystack, INVOICE_ATTACHMENTS_HINTS) ? 1 : 0,
    containsMonetaryAmount(`${item.title}\n${item.body ?? ""}`) ? 2 : 0,
    hasAnyHint(haystack, INVOICE_NUMBER_HINTS) ? 2 : 0,
    hasAnyHint(sender, INVOICE_SENDER_HINTS) ? 1 : 0,
  ];

  return checks.reduce((total, value) => total + value, 0);
}

function looksLikeInvoice(item: InboxItem): boolean {
  return getInvoiceScore(item) >= 4;
}

function looksImportantReview(item: InboxItem): boolean {
  if (looksTechnical(item)) return false;

  const haystack = getMailHaystack(item);
  return item.classification === "REVIEW"
    || item.priority === "HIGH"
    || hasAnyHint(haystack, REVIEW_KEYWORDS);
}

function buildSenderGroups(items: InboxItem[]): MailSenderGroup[] {
  const map = new Map<string, { count: number; samples: string[] }>();

  for (const item of items) {
    const sender = extractSender(item.body);
    const current = map.get(sender) ?? { count: 0, samples: [] };
    current.count += 1;
    if (current.samples.length < 3) current.samples.push(item.title);
    map.set(sender, current);
  }

  return [...map.entries()]
    .map(([sender, value]) => ({ sender, count: value.count, samples: value.samples }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildSuggestions(
  newsletters: InboxItem[],
  invoices: InboxItem[],
  reviewQueue: InboxItem[],
  topSenders: MailSenderGroup[],
  noisySenders: MailSenderGroup[],
): MailSuggestion[] {
  const suggestions: MailSuggestion[] = [];

  const newsletterGroups = buildSenderGroups(newsletters).filter((group) => group.count >= 2);
  for (const group of newsletterGroups.slice(0, 2)) {
    suggestions.push({
      id: `newsletter-${group.sender}`,
      title: "Newsletter prescindible candidata",
      detail: `${group.sender} · ${group.count} correos detectados`,
      kind: "newsletter",
      href: ROUTE_PATHS.MAIL_ANALYSIS,
    });
  }

  for (const invoice of invoices.slice(0, 2)) {
    suggestions.push({
      id: `invoice-${invoice.id}`,
      title: "Factura probable detectada",
      detail: invoice.title,
      kind: "invoice",
      href: ROUTE_PATHS.INBOX,
    });
  }

  for (const review of reviewQueue.slice(0, 2)) {
    suggestions.push({
      id: `review-${review.id}`,
      title: "Correo que merece revisión",
      detail: review.title,
      kind: "review",
      href: ROUTE_PATHS.INBOX,
    });
  }

  for (const sender of topSenders.slice(0, 2)) {
    suggestions.push({
      id: `sender-${sender.sender}`,
      title: "Remitente muy repetido en tu correo",
      detail: `${sender.sender} · ${sender.count} mensajes`,
      kind: "sender",
      href: ROUTE_PATHS.MAIL_ANALYSIS,
    });
  }

  for (const sender of noisySenders.slice(0, 2)) {
    suggestions.push({
      id: `pattern-${sender.sender}`,
      title: "Emisor ruidoso para revisar",
      detail: `${sender.sender} aparece ${sender.count} veces y parece poco accionable`,
      kind: "pattern",
      href: ROUTE_PATHS.MAIL_ANALYSIS,
    });
  }

  return suggestions.slice(0, 8);
}

export async function analyzeMailInbox(): Promise<MailAnalysisResult> {
  const emailItems = await inboxRepo.findAll({ sourceType: "EMAIL", status: "PENDING", pageSize: 200 });
  const items = emailItems.items;

  const newsletters = items.filter(looksLikeNewsletter);
  const probableInvoices = items.filter(looksLikeInvoice);
  const reviewQueue = items.filter(looksImportantReview);
  const topSenders = buildSenderGroups(items).filter((group) => group.sender !== "unknown");
  const noisySenders = buildSenderGroups(
    items.filter((item) => looksLikeNewsletter(item) || (!looksImportantReview(item) && !looksLikeInvoice(item) && !looksTechnical(item))),
  ).filter((group) => group.count >= 2);
  const suggestions = buildSuggestions(newsletters, probableInvoices, reviewQueue, topSenders, noisySenders);

  return {
    suggestions,
    newsletters: buildSenderGroups(newsletters),
    reviewQueue: reviewQueue.slice(0, 20),
    probableInvoices: probableInvoices.slice(0, 20),
    topSenders: topSenders.slice(0, 5),
    noisySenders: noisySenders.slice(0, 5),
  };
}
