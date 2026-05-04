import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  try {
    const sessionData = await service.getSession(sessionId);
    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (sessionData.status !== "READY") {
      return NextResponse.json(
        { error: `Session must be READY, current: ${sessionData.status}` },
        { status: 409 },
      );
    }

    const result = await service.executeSession(sessionId);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error(`[EmailTriage API] POST /api/email-triage/${sessionId}/execute:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
