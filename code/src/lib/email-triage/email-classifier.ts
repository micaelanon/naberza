import { GoogleGenAI } from "@google/genai";

const VERTEX_PROJECT = process.env.VERTEX_PROJECT_ID ?? "gen-lang-client-0984205249";
const VERTEX_LOCATION = process.env.VERTEX_LOCATION ?? "global";

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

let genAi: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genAi) {
    genAi = new GoogleGenAI({
      vertexai: true,
      project: VERTEX_PROJECT,
      location: VERTEX_LOCATION,
    });
  }
  return genAi;
}

function chunkEmails(emails: EmailToClassify[]): EmailToClassify[][] {
  const batches: EmailToClassify[][] = [];
  for (let i = 0; i < emails.length; i += EMAIL_BATCH_SIZE) {
    batches.push(emails.slice(i, i + EMAIL_BATCH_SIZE));
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

function cleanResponseText(text: string): string {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function buildUserPrompt(batch: EmailToClassify[], now: Date): string {
  const items = batch.map((e) => ({
    uid: e.uid,
    from: e.from,
    subject: e.subject,
    date: e.date.toISOString(),
    hasAttachments: e.hasAttachments,
    attachmentNames: e.attachmentNames,
    isRead: e.isRead,
    snippet: e.snippet,
  }));
  return `Clasifica estos emails. Fecha actual: ${now.toISOString()}\n\n${JSON.stringify(items, null, 2)}\n\nResponde ÚNICAMENTE con un JSON array con este formato:\n[\n  { "uid": 123, "decision": "trash", "reason": "...", "confidence": 0.95, "category": "newsletter" }\n]`;
}

function extractTextFromGeminiResponse(response: Awaited<ReturnType<ReturnType<typeof getClient>["models"]["generateContent"]>>): string {
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text?.trim()) throw new Error("Empty response from Gemini");
  return text;
}

function buildResultMap(parsed: Array<Partial<ClassificationResult>>): Map<number, Partial<ClassificationResult>> {
  const map = new Map<number, Partial<ClassificationResult>>();
  for (const item of parsed) {
    if (typeof item.uid === "number") map.set(item.uid, item);
  }
  return map;
}

async function classifyBatchWithGemini(
  batch: EmailToClassify[],
  now: Date,
): Promise<ClassificationResult[]> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + buildUserPrompt(batch, now) }] }],
    config: { temperature: 0.1, maxOutputTokens: 4096 },
  });
  const parsed = JSON.parse(cleanResponseText(extractTextFromGeminiResponse(response))) as Array<Partial<ClassificationResult>>;
  const resultByUid = buildResultMap(parsed);
  return batch.map((email) => normalizeResult(email, resultByUid.get(email.uid), now));
}

async function classifyBatchWithRetry(
  batch: EmailToClassify[],
  now: Date,
): Promise<ClassificationResult[]> {
  try {
    return await classifyBatchWithGemini(batch, now);
  } catch {
    try {
      return await classifyBatchWithGemini(batch, now);
    } catch {
      return buildFallbackResults(batch).map((result) =>
        applyHardRules(
          batch.find((email) => email.uid === result.uid) as EmailToClassify,
          result,
          now,
        ),
      );
    }
  }
}

export async function classifyEmailBatch(emails: EmailToClassify[]): Promise<ClassificationResult[]> {
  if (!emails.length) {
    return [];
  }

  const now = new Date();
  const batches = chunkEmails(emails);
  const results = await Promise.all(
    batches.map((batch) => classifyBatchWithRetry(batch, now)),
  );

  return results.flat();
}
