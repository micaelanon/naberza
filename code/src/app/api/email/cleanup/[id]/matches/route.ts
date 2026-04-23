import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CleanupService } from "@/modules/email-cleanup/cleanup.service";
import { CleanupRepository } from "@/modules/email-cleanup/cleanup.repository";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { AuditService } from "@/lib/audit";
import { unauthorized, notFound, success } from "@/lib/api-responses";

/**
 * GET /api/email/cleanup/[id]/matches
 * Preview emails that would match this cleanup rule
 */
export async function GET(
  _req: NextRequest,
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

    const rule = await service.getRule((session.user as any).id, id);
    if (!rule) {
      return notFound("Rule not found");
    }

    const preview = await service.previewMatches((session.user as any).id, id);
    return success(preview);
  } catch (error) {
    console.error("Error previewing cleanup matches:", error);
    return NextResponse.json(
      { error: "Failed to preview matches" },
      { status: 500 }
    );
  }
}
