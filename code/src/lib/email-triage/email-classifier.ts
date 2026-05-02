import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

export interface EmailToClassify {
  uid: number;
  from: string;
  subject: string;
  date: Date;
  hasAttachments: boolean;
  attachmentNames: string[];
  isRead: boolean;
  snippet?: string;
}

export type TriageDecision = "trash" | "archive" | "keep" | "review";

export interface ClassificationResult {
  uid: number;
  decision: TriageDecision;
  reason: string;
  confidence: number;
  category: string;
}

const EMAIL_BATCH_SIZE = 20;
const MODEL_ID = "claude-haiku-4-5-20251001";
const FALLBACK_REASON = "Clasificación no disponible; revisar manualmente";
const FALLBACK_CATEGORY = "review";
const PROTECTED_SUBJECT_KEYWORDS = [
  "factura",
  "invoice",
  "pago",
  "payment",
  "bank",
  "banco",
  "afip",
  "hacienda",
  "seguro",
  "renovación",
];
const PDF_ATTACHMENT_EXTENSIONS = [".pdf"];
const RECENT_EMAIL_WINDOW_MS = 48 * 60 * 60 * 1000;
const SYSTEM_PROMPT = `Eres un asistente personal de limpieza de correo electrónico. Tu trabajo es analizar emails y decidir si se pueden eliminar de forma segura del inbox.

Criterios de decisión:
- "trash": newsletters, emails promocionales, notificaciones automáticas de CI/CD (GitHub Actions, Vercel, etc.), alertas de plataformas (Snyk, Dependabot), emails de marketing, códigos de un solo uso ya caducados, confirmaciones de suscripción antiguas, emails de redes sociales (Twitter/X, LinkedIn notificaciones), notificaciones automáticas de aplicaciones que no requieren acción.
- "archive": facturas/recibos importantes, confirmaciones de compra, emails de bancos o administraciones, invitaciones de calendario pasadas, cualquier cosa que sea importante conservar pero no necesita estar en el inbox activo.
- "keep": emails de personas reales dirigidos directamente al usuario, cualquier cosa que requiera respuesta o acción pendiente, emails recientes importantes.
- "review": cualquier cosa donde no estés seguro. Si hay duda, siempre "review".

REGLAS ABSOLUTAS que no puedes ignorar:
- Si el email tiene adjuntos PDF → siempre "archive" o "review", nunca "trash"
- Si el email tiene menos de 48 horas de antigüedad → siempre "keep"
- Si el asunto contiene palabras como "factura", "invoice", "pago", "payment", "bank", "banco", "AFIP", "Hacienda", "seguro", "renovación" → "archive"
- Ante la duda mínima → "review"

Responde ÚNICAMENTE con un JSON array, sin texto adicional.`;

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  anthropicClient ??= new Anthropic({ apiKey: env.anthropicApiKey });
  return anthropicClient;
}

function chunkEmails(emails: EmailToClassify[]): EmailToClassify[][] {
  const batches: EmailToClassify[][] = [];

  for (let index = 0; index < emails.length; index += EMAIL_BATCH_SIZE) {
    batches.push(emails.slice(index, index + EMAIL_BATCH_SIZE));
  }

  return batches;
}

function normalizeDecision(value: unknown): TriageDecision {
  return value === "trash" || value === "archive" || value === "keep" || value === "review"
    ? value
    : "review";
}

function buildFallbackResults(emails: EmailToClassify[]): ClassificationResult[] {
  return emails.map((email) => ({
    uid: email.uid,
    decision: getForcedDecision(email) ?? "review",
    reason: FALLBACK_REASON,
    confidence: 0,
    category: FALLBACK_CATEGORY,
  }));
}

function parseResponseText(response: unknown): string {
  if (!response || typeof response !== "object") {
    throw new Error("Anthropic response is empty");
  }

  const content = Reflect.get(response, "content");
  if (!Array.isArray(content)) {
    throw new Error("Anthropic response content is invalid");
  }

  const text = content
    .filter((block) => Boolean(block) && typeof block === "object" && Reflect.get(block, "type") === "text")
    .map((block) => Reflect.get(block, "text"))
    .filter((value): value is string => typeof value === "string")
    .join("\n");

  if (!text.trim()) {
    throw new Error("Anthropic response does not contain text");
  }

  return text;
}

function getNormalizedReason(partialResult: Partial<ClassificationResult> | undefined): string {
  return typeof partialResult?.reason === "string" && partialResult.reason.trim()
    ? partialResult.reason
    : FALLBACK_REASON;
}

function getNormalizedCategory(partialResult: Partial<ClassificationResult> | undefined): string {
  return typeof partialResult?.category === "string" && partialResult.category.trim()
    ? partialResult.category
    : FALLBACK_CATEGORY;
}

function normalizeResult(
  email: EmailToClassify,
  partialResult: Partial<ClassificationResult> | undefined,
  now: Date,
): ClassificationResult {
  const fallbackDecision = getForcedDecision(email, now);
  const baseDecision = normalizeDecision(partialResult?.decision);

  return applyHardRules(email, {
    uid: email.uid,
    decision: fallbackDecision ?? baseDecision,
    reason: getNormalizedReason(partialResult),
    confidence: typeof partialResult?.confidence === "number" ? partialResult.confidence : 0,
    category: getNormalizedCategory(partialResult),
  }, now);
}

function hasPdfAttachment(email: EmailToClassify): boolean {
  return email.attachmentNames.some((attachmentName) => {
    const normalizedAttachmentName = attachmentName.toLowerCase();
    return PDF_ATTACHMENT_EXTENSIONS.some((extension) => normalizedAttachmentName.endsWith(extension));
  });
}

function subjectRequiresArchive(email: EmailToClassify): boolean {
  const normalizedSubject = email.subject.toLowerCase();
  return PROTECTED_SUBJECT_KEYWORDS.some((keyword) => normalizedSubject.includes(keyword));
}

function isRecentEmail(email: EmailToClassify, now: Date): boolean {
  return now.getTime() - email.date.getTime() < RECENT_EMAIL_WINDOW_MS;
}

function getForcedDecision(email: EmailToClassify, now: Date = new Date()): TriageDecision | null {
  if (isRecentEmail(email, now)) {
    return "keep";
  }

  if (subjectRequiresArchive(email)) {
    return "archive";
  }

  if (hasPdfAttachment(email)) {
    return "review";
  }

  return null;
}

function applyHardRules(email: EmailToClassify, result: ClassificationResult, now: Date): ClassificationResult {
  if (isRecentEmail(email, now)) {
    return {
      ...result,
      decision: "keep",
      reason: "Email reciente de menos de 48 horas",
      category: result.category === FALLBACK_CATEGORY ? "recent" : result.category,
    };
  }

  if (subjectRequiresArchive(email)) {
    return {
      ...result,
      decision: "archive",
      reason: "Asunto con indicios de factura o gestión importante",
      category: result.category === FALLBACK_CATEGORY ? "invoice" : result.category,
    };
  }

  if (hasPdfAttachment(email) && result.decision !== "archive") {
    return {
      ...result,
      decision: "review",
      reason: "Adjunto PDF detectado; requiere revisión manual",
      category: result.category === FALLBACK_CATEGORY ? "document" : result.category,
    };
  }

  return result;
}

async function classifyBatchWithAnthropic(batch: EmailToClassify[], now: Date): Promise<ClassificationResult[]> {
  const client = getAnthropicClient();
  const response = await client.beta.messages.create({
    model: MODEL_ID,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Clasifica estos emails. Fecha actual: ${now.toISOString()}\n\n${JSON.stringify(batch, null, 2)}\n\nResponde con:\n[\n  { \"uid\": 123, \"decision\": \"trash\", \"reason\": \"Newsletter de marketing\", \"confidence\": 0.95, \"category\": \"newsletter\" }\n]`,
      },
    ],
  });

  const responseText = parseResponseText(response);
  const parsedResponse = JSON.parse(responseText) as Array<Partial<ClassificationResult>>;
  const resultByUid = new Map<number, Partial<ClassificationResult>>();

  for (const item of parsedResponse) {
    if (typeof item.uid === "number") {
      resultByUid.set(item.uid, item);
    }
  }

  return batch.map((email) => normalizeResult(email, resultByUid.get(email.uid), now));
}

async function classifyBatchWithRetry(batch: EmailToClassify[], now: Date): Promise<ClassificationResult[]> {
  try {
    return await classifyBatchWithAnthropic(batch, now);
  } catch {
    try {
      return await classifyBatchWithAnthropic(batch, now);
    } catch {
      return buildFallbackResults(batch).map((result) => applyHardRules(
        batch.find((email) => email.uid === result.uid) as EmailToClassify,
        result,
        now,
      ));
    }
  }
}

export async function classifyEmailBatch(emails: EmailToClassify[]): Promise<ClassificationResult[]> {
  if (!emails.length) {
    return [];
  }

  const now = new Date();
  const batches = chunkEmails(emails);
  const results = await Promise.all(batches.map((batch) => classifyBatchWithRetry(batch, now)));

  return results.flat();
}
