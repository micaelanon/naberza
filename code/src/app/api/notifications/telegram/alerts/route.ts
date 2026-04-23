import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServiceFactory } from "@/lib/service-factory";
import { unauthorized, notFound, success, badRequest } from "@/lib/api-responses";

/**
 * GET /api/notifications/telegram/alerts
 * List all Telegram alerts for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return unauthorized();
    }

    const { telegramService } = getServiceFactory();
    const preference = await telegramService.getPreference(userId);

    if (!preference) {
      return notFound("Telegram preference not found");
    }

    // Parse query parameters for filtering
    const url = new URL(request.url);
    const enabled = url.searchParams.get("enabled");
    const triggerType = url.searchParams.get("triggerType");

    const alerts = await telegramService.listAlerts(preference.id, {
      ...(enabled !== null && { enabled: enabled === "true" }),
      ...(triggerType && { triggerType: triggerType as any }),
    });

    return success({
      alerts,
      total: alerts.length,
    });
  } catch (error) {
    console.error("Error fetching Telegram alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/telegram/alerts
 * Create a new Telegram alert
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return unauthorized();
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.triggerType || !body.config) {
      return badRequest("Missing required fields: name, triggerType, config");
    }

    const { telegramService } = getServiceFactory();
    const preference = await telegramService.getPreference(userId);

    if (!preference) {
      return notFound("Telegram preference not found");
    }

    const alert = await telegramService.createAlert({
      telegramPreferenceId: preference.id,
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      config: body.config,
      priority: body.priority,
    });

    return success(alert, 201);
  } catch (error) {
    console.error("Error creating Telegram alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
