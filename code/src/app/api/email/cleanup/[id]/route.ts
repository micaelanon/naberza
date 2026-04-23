import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CleanupService } from "@/modules/email-cleanup/cleanup.service";
import { CleanupRepository } from "@/modules/email-cleanup/cleanup.repository";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { AuditService } from "@/lib/audit";
import { unauthorized, notFound, success } from "@/lib/api-responses";

/**
 * GET /api/email/cleanup/[id]
 * Get a specific cleanup rule
 */
export async function GET(
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
    const service = new CleanupService(repository, new InboxRepository(), new AuditService());

    const rule = await service.getRule(userId, id);
    if (!rule) {
      return notFound("Rule not found");
    }

    return success(rule);
  } catch (error) {
    console.error("Error fetching cleanup rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch rule" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email/cleanup/[id]
 * Update a cleanup rule
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();

    const repository = new CleanupRepository();
    const service = new CleanupService(repository, new InboxRepository(), new AuditService());

    const rule = await service.getRule(userId, id);
    if (!rule) {
      return notFound("Rule not found");
    }

    const updated = await service.updateRule(userId, id, body);
    return success(updated);
  } catch (error) {
    console.error("Error updating cleanup rule:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email/cleanup/[id]
 * Delete a cleanup rule
 */
export async function DELETE(
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
    const service = new CleanupService(repository, new InboxRepository(), new AuditService());

    const rule = await service.getRule(userId, id);
    if (!rule) {
      return notFound("Rule not found");
    }

    await service.deleteRule(userId, id);
    return success({ success: true });
  } catch (error) {
    console.error("Error deleting cleanup rule:", error);
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}
