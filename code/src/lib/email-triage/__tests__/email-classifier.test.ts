import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailToClassify } from "@/lib/email-triage/email-classifier";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("@google/genai", () => {
  const modelsMock = { generateContent: generateContentMock };
  return {
    GoogleGenAI: vi.fn(() => ({
      models: modelsMock,
    })),
  };
});

import { classifyEmailBatch } from "@/lib/email-triage/email-classifier";

function makeResponse(payload: unknown) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: JSON.stringify(payload) }],
        },
      },
    ],
  };
}

function makeEmail(overrides: Partial<EmailToClassify> = {}): EmailToClassify {
  return {
    uid: 1,
    from: "notifications@github.com",
    subject: "GitHub Actions workflow run failed",
    date: new Date(Date.now() - 72 * 60 * 60 * 1000),
    hasAttachments: false,
    attachmentNames: [],
    isRead: false,
    snippet: "CI notification",
    ...overrides,
  };
}

describe("classifyEmailBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies GitHub Actions emails as trash", async () => {
    generateContentMock.mockResolvedValue(
      makeResponse([
        {
          uid: 1,
          decision: "trash",
          reason: "Notificación automática de CI",
          confidence: 0.98,
          category: "ci-notification",
        },
      ]),
    );

    const result = await classifyEmailBatch([makeEmail()]);

    expect(result).toEqual([
      {
        uid: 1,
        decision: "trash",
        reason: "Notificación automática de CI",
        confidence: 0.98,
        category: "ci-notification",
      },
    ]);
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("never returns trash for emails with PDF attachments", async () => {
    generateContentMock.mockResolvedValue(
      makeResponse([
        {
          uid: 2,
          decision: "trash",
          reason: "Promoción",
          confidence: 0.91,
          category: "newsletter",
        },
      ]),
    );

    const result = await classifyEmailBatch([
      makeEmail({
        uid: 2,
        subject: "Resumen mensual",
        hasAttachments: true,
        attachmentNames: ["factura.pdf"],
      }),
    ]);

    expect(result[0]?.decision).toBe("review");
    expect(result[0]?.reason).toContain("PDF");
  });

  it("always keeps emails newer than 48 hours", async () => {
    generateContentMock.mockResolvedValue(
      makeResponse([
        {
          uid: 3,
          decision: "trash",
          reason: "Promoción",
          confidence: 0.75,
          category: "newsletter",
        },
      ]),
    );

    const result = await classifyEmailBatch([
      makeEmail({
        uid: 3,
        date: new Date(Date.now() - 60 * 60 * 1000),
        subject: "Recordatorio personal",
        from: "friend@example.com",
      }),
    ]);

    expect(result[0]?.decision).toBe("keep");
    expect(result[0]?.reason).toContain("48 horas");
  });

  it("marks all batch items as review when the API fails twice", async () => {
    generateContentMock.mockRejectedValue(new Error("Gemini unavailable"));

    const result = await classifyEmailBatch([
      makeEmail({ uid: 4, subject: "Email A" }),
      makeEmail({ uid: 5, subject: "Email B", from: "ops@example.com" }),
    ]);

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject([
      { uid: 4, decision: "review" },
      { uid: 5, decision: "review" },
    ]);
  });

  it("splits batches larger than 20 emails into multiple API calls", async () => {
    generateContentMock
      .mockResolvedValueOnce(
        makeResponse(
          Array.from({ length: 20 }, (_, index) => ({
            uid: index + 1,
            decision: "trash",
            reason: `Auto ${index + 1}`,
            confidence: 0.9,
            category: "newsletter",
          })),
        ),
      )
      .mockResolvedValueOnce(
        makeResponse([
          {
            uid: 21,
            decision: "archive",
            reason: "Invoice",
            confidence: 0.88,
            category: "invoice",
          },
        ]),
      );

    const emails = Array.from({ length: 21 }, (_, index) =>
      makeEmail({
        uid: index + 1,
        subject: index === 20 ? "Invoice for April" : `Email ${index + 1}`,
      }),
    );

    const result = await classifyEmailBatch(emails);

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(21);
    expect(result[20]).toEqual({
      uid: 21,
      decision: "archive",
      reason: "Asunto con indicios de factura o gestión importante",
      confidence: 0.88,
      category: "invoice",
    });
  });
});
