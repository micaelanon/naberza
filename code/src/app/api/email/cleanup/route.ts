import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CleanupService } from "@/modules/email-cleanup/cleanup.service";
import { CleanupRepository } from "@/modules/email-cleanup/cleanup.repository";
import { InboxRepository } from "@/modules/inbox/inbox.repository";
import { AuditService } from "@/lib/audit";
import { unauthorized, success, badRequest } from "@/lib/api-responses";

/**
 * GET /api/email/cleanup
 * List all cleanup rules for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return unauthorized();
    }

    const repository = new CleanupRepository();
    const service = new CleanupService(repository, new InboxRepository(), new AuditService());

    const url = new URL(request.url);
    const enabled = url.searchParams.get("enabled");
    const matchType = url.searchParams.get("matchType");
    const action = url.searchParams.get("action");

    const rules = await service.listRules(userId, {
      ...(enabled !== null && { enabled: enabled === "true" }),
      ...(matchType && { matchType: matchType as any }),
      ...(action && { action: action as any }),
    });

    return success({
      rules,
      total: rules.length,
    });
  } catch (error) {
    console.error("Error listing cleanup rules:", error);
    return NextResponse.json({ error: "Failed to list rules" }, { status: 500 });
  }
}

/**
 * POST /api/email/cleanup
 * Create a new cleanup rule
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return unauthorized();
    }

    const body = await request.json();

    if (!body.name || !body.matchType || !body.action || !body.config) {
      return badRequest("Missing required fields: name, matchType, action, config");
    }

    const repository = new CleanupRepository();
    const service = new CleanupService(repository, new InboxRepository(), new AuditService());

    console.log("[email-cleanup][create] session user", {
      id: userId,
      email: (session?.user as any)?.email,
      name: (session?.user as any)?.name,
    });

    const rule = await service.createRule(userId, {
      name: body.name,
      description: body.description,
      matchType: body.matchType,
      action: body.action,
      config: body.config,
      priority: body.priority,
      dryRunEnabled: body.dryRunEnabled,
    });

    return success(rule, 201);
  } catch (error) {
    console.error("Error creating cleanup rule:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}
