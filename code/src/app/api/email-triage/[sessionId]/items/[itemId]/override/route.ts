import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { EmailTriageRepository } from "@/modules/email-triage/email-triage.repository";
import { EmailTriageService } from "@/modules/email-triage/email-triage.service";
import { MailImapAdapter } from "@/lib/adapters/mail/mail-imap.adapter";

const repository = new EmailTriageRepository();
const service = new EmailTriageService(repository, () => {
  const connectionConfig = {
    id: "email-imap",
    name: "Mailbox IMAP",
    type: "email_imap" as const,
    status: "active" as const,
    permissions: { read: true, write: true },
    config: {
      host: process.env.MAIL_IMAP_HOST ?? "",
      port: Number(process.env.MAIL_IMAP_PORT ?? "993"),
      secure: true,
      user: process.env.MAIL_IMAP_USER ?? "",
      password: process.env.MAIL_IMAP_PASSWORD ?? "",
    },
  };
  return new MailImapAdapter(connectionConfig);
});

const VALID_DECISIONS = ["TRASH", "ARCHIVE", "KEEP", "REVIEW"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; itemId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const decision = body.decision as string | undefined;

    if (!decision || !VALID_DECISIONS.includes(decision)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(", ")}` },
        { status: 400 },
      );
    }

    await service.overrideDecision(itemId, decision);

    return NextResponse.json({ data: { itemId, decision } });
  } catch (error) {
    console.error(
      `[EmailTriage API] POST /api/email-triage/.../items/${itemId}/override:`,
      error,
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
