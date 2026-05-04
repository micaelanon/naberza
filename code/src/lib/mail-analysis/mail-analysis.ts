import { InboxRepository } from "@/modules/inbox/inbox.repository";
import type { InboxItem } from "@/modules/inbox/inbox.types";

export interface MailSenderGroup {
  sender: string;
  count: number;
  samples: string[];
  unsubscribeUrl?: string;
}

export interface MailAnalysisResult {
  newsletters: MailSenderGroup[];
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

export function extractUnsubscribeLink(body: string | null): string | undefined {
  if (!body) return undefined;

  // Intentar header List-Unsubscribe:
  const headerUrl = tryListUnsubscribeHeader(body);
  if (headerUrl) return headerUrl;

  // Buscar enlaces unsubscribe en el body
  const lowerBody = body.toLowerCase();
  const keywords = ["unsubscribe", "darse de baja", "cancelar suscripción"];

  for (const keyword of keywords) {
    const idx = lowerBody.indexOf(keyword);
    if (idx === -1) continue;

    const before = body.slice(Math.max(0, idx - 400), idx);
    const urlMatch = before.match(/https?:\/\/[^\s<>"')]+/g);
    if (urlMatch) {
      const url = sanitizeUrlCandidate(urlMatch[urlMatch.length - 1]);
      if (url.startsWith("https://")) return url;
    }
  }

  return undefined;
}

function tryListUnsubscribeHeader(body: string): string | undefined {
  const line = body.split("\n").find((l) =>
    l.trim().toLowerCase().startsWith("list-unsubscribe:")
  );
  if (!line) return undefined;

  const value = line.slice("list-unsubscribe:".length).trim();
  // eslint-disable-next-line sonarjs/slow-regex
  const urlMatch = value.match(/<([^>]+)>/);
  if (!urlMatch) return undefined;

  const url = sanitizeUrlCandidate(urlMatch[1]);
  if (url.startsWith("https://")) return url;
  return undefined;
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

function buildSenderGroups(items: InboxItem[]): MailSenderGroup[] {
  const map = new Map<string, { count: number; samples: string[]; firstBody: string }>();

  for (const item of items) {
    const sender = extractSender(item.body);
    const current = map.get(sender) ?? { count: 0, samples: [], firstBody: item.body ?? "" };
    current.count += 1;
    if (current.samples.length < 3) current.samples.push(item.title);
    map.set(sender, current);
  }

  return [...map.entries()]
    .map(([sender, value]) => ({
      sender,
      count: value.count,
      samples: value.samples,
      unsubscribeUrl: extractUnsubscribeLink(value.firstBody),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function analyzeMailInbox(): Promise<MailAnalysisResult> {
  const emailItems = await inboxRepo.findAll({ sourceType: "EMAIL", status: "PENDING", pageSize: 200 });
  const items = emailItems.items;

  const newsletters = items.filter(looksLikeNewsletter);
  const topSenders = buildSenderGroups(items).filter((group) => group.sender !== "unknown");
  const noisySenders = buildSenderGroups(
    items.filter((item) => looksLikeNewsletter(item) || !looksTechnical(item)),
  ).filter((group) => group.count >= 2);

  return {
    newsletters: buildSenderGroups(newsletters),
    topSenders: topSenders.slice(0, 5),
    noisySenders: noisySenders.slice(0, 5),
  };
}
