import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServiceFactory } from "@/lib/service-factory";
import { unauthorized, notFound, success, forbidden, badRequest } from "@/lib/api-responses";

/**
 * POST /api/notifications/telegram/alerts/[id]/toggle
 * Toggle a Telegram alert enabled/disabled state
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
    const body = await request.json();

    if (body.enabled === undefined) {
      return badRequest("Missing required field: enabled");
    }

    const { telegramService } = getServiceFactory();
    const alert = await telegramService.getAlert(id);

    if (!alert) {
      return notFound("Alert not found");
    }

    // Verify ownership
    const preference = await telegramService.getPreference(session.user.id);
    if (!preference || preference.id !== alert.telegramPreferenceId) {
      return forbidden();
    }

    const updated = await telegramService.toggleAlert(id, body.enabled);
    return success(updated);
  } catch (error) {
    console.error("Error toggling Telegram alert:", error);
    return NextResponse.json(
      { error: "Failed to toggle alert" },
      { status: 500 }
    );
  }
}
