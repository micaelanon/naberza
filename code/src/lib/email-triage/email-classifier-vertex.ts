import { VertexAI } from "@google-cloud/vertexai";
import path from "node:path";

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

const MODEL = "gemini-2.0-flash-001";
const PROJECT = "gen-lang-client-0984205249";
const LOCATION = "us-central1";
const BATCH_SIZE = 20;

const SYSTEM_PROMPT = `Eres un asistente personal de limpieza de correo electrónico. Tu trabajo es analizar emails y decidir si se pueden eliminar de forma segura del inbox.

Criterios de decisión:
- "trash": newsletters, emails promocionales, notificaciones automáticas de CI/CD (GitHub Actions, Vercel, etc.), alertas de plataformas (Snyk, Dependabot), emails de marketing, códigos de un solo uso ya caducados, confirmaciones de suscripción antiguas, notificaciones automáticas de aplicaciones que no requieren acción.
- "archive": facturas/recibos importantes, confirmaciones de compra, emails de bancos o administraciones, invitaciones de calendario pasadas, cualquier cosa que sea importante conservar pero no necesita estar en el inbox activo.
- "keep": emails de personas reales dirigidos directamente al usuario, cualquier cosa que requiera respuesta o acción pendiente, emails recientes importantes.
- "review": cualquier cosa donde no estés seguro. Si hay duda, siempre "review".

REGLAS ABSOLUTAS que no puedes ignorar:
- Si el email tiene adjuntos PDF → siempre "archive" o "review", nunca "trash"
- Si el email tiene menos de 48 horas de antigüedad → siempre "keep"
- Si el asunto contiene palabras como "factura", "invoice", "pago", "payment", "bank", "banco", "AFIP", "Hacienda", "seguro", "renovación" → "archive"
- Ante la duda mínima → "review"

Responde ÚNICAMENTE con un JSON array, sin texto adicional.`;

let vertex: VertexAI | null = null;

function getVertex(): VertexAI {
  if (!vertex) {
    const keyPath = path.resolve(process.cwd(), env.googleServiceAccountPath ?? "./vertex-key.json");
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    vertex = new VertexAI({ project: PROJECT, location: LOCATION });
  }
  return vertex;
}

function chunkEmails(emails: EmailToClassify[]): EmailToClassify[][] {
  const batches: EmailToClassify[][] = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    batches.push(emails.slice(i, i + BATCH_SIZE));
  }
  return batches;
}

function buildFallbackResults(batch: EmailToClassify[]): ClassificationResult[] {
  return batch.map((email) => ({
    uid: email.uid,
    decision: "review" as TriageDecision,
    reason: "Clasificación no disponible; revisar manualmente",
    confidence: 0,
    category: "review",
  }));
}

async function classifyBatchWithGemini(batch: EmailToClassify[]): Promise<ClassificationResult[]> {
  const client = getVertex().getGenerativeModel({ model: MODEL });

  const userPrompt = `Clasifica estos emails. Fecha actual: ${new Date().toISOString()}

${JSON.stringify(
  batch.map((e) => ({
    uid: e.uid,
    from: e.from,
    subject: e.subject,
    date: e.date.toISOString(),
    hasAttachments: e.hasAttachments,
    snippet: e.snippet,
  })),
  null,
  2,
)}

Responde con un JSON array con este formato:
[
  { "uid": 123, "decision": "trash", "reason": "...", "confidence": 0.95, "category": "newsletter" }
]`;

  try {
    const result = await client.generateContent({
      contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    const candidate = result.response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text?.trim()) throw new Error("Empty response from Gemini");

    // Limpiar posibles marcadores de código Markdown
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const parsed = JSON.parse(clean) as Array<Partial<ClassificationResult>>;
    const byUid = new Map<number, Partial<ClassificationResult>>();
    for (const item of parsed) {
      if (typeof item.uid === "number") byUid.set(item.uid, item);
    }

    return batch.map((email) => {
      const r = byUid.get(email.uid);
      const decision = r?.decision ?? "review";
      return {
        uid: email.uid,
        decision: ["trash", "archive", "keep", "review"].includes(decision) ? decision as TriageDecision : "review",
        reason: typeof r?.reason === "string" ? r.reason : "Clasificación no disponible",
        confidence: typeof r?.confidence === "number" ? r.confidence : 0,
        category: typeof r?.category === "string" && r.category ? r.category : "other",
      };
    });
  } catch (err) {
    console.error("[EmailClassifier] Gemini batch failed:", err);
    return buildFallbackResults(batch);
  }
}

export async function classifyEmailBatch(emails: EmailToClassify[]): Promise<ClassificationResult[]> {
  if (emails.length === 0) return [];

  const batches = chunkEmails(emails);
  const results = await Promise.all(batches.map(classifyBatchWithGemini));

  return results.flat();
}
