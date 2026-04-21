import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CleanupService } from "@/modules/email-cleanup/cleanup.service";
import { CleanupRepository } from "@/modules/email-cleanup/cleanup.repository";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { AuditService } from "@/lib/audit";
import { unauthorized, notFound, success } from "@/lib/api-responses";

/**
 * POST /api/email/cleanup/[id]/execute
 * Execute the cleanup rule (actually delete/archive emails)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await params;
    const repository = new CleanupRepository();
    const service = new CleanupService(repository, new InboxRepository(), new AuditService());

    const rule = await service.getRule(session.user.id, id);
    if (!rule) {
      return notFound("Rule not found");
    }

    const result = await service.executeCleanup(session.user.id, id);
    return success(result);
  } catch (error) {
    console.error("Error executing cleanup:", error);
    const message = error instanceof Error ? error.message : "Failed to execute cleanup";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
