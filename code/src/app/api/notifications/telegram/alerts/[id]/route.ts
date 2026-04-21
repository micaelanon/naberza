import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServiceFactory } from "@/lib/service-factory";
import { unauthorized, notFound, success, forbidden } from "@/lib/api-responses";

/**
 * GET /api/notifications/telegram/alerts/[id]
 * Get a specific Telegram alert
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await params;
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

    return success(alert);
  } catch (error) {
    console.error("Error fetching Telegram alert:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/telegram/alerts/[id]
 * Update a Telegram alert
 */
export async function PUT(
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

    const updated = await telegramService.updateAlert(id, body);
    return success(updated);
  } catch (error) {
    console.error("Error updating Telegram alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/telegram/alerts/[id]
 * Delete a Telegram alert
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorized();
    }

    const { id } = await params;
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

    await telegramService.deleteAlert(id);
    return success({ success: true });
  } catch (error) {
    console.error("Error deleting Telegram alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
