import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CleanupService } from "@/modules/email-cleanup/cleanup.service";
import { CleanupRepository } from "@/modules/email-cleanup/cleanup.repository";
import { AuditService } from "@/lib/audit";
import { unauthorized, notFound, success } from "@/lib/api-responses";

/**
 * POST /api/email/cleanup/[id]/execute
 * Execute the cleanup rule (actually delete/archive emails)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return unauthorized();
    }

    const { id } = await params;
    const repository = new CleanupRepository();
    const service = new CleanupService(repository, new AuditService());

    const rule = await service.getRule(userId, id);
    if (!rule) {
      return notFound("Rule not found");
    }

    const result = await service.executeCleanup(userId, id);
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
