import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getServiceFactory } from "@/lib/service-factory";
import { unauthorized, notFound, success } from "@/lib/api-responses";

/**
 * GET /api/notifications/telegram/preferences
 * Get current user's Telegram preference
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized();
    }

    const { telegramService } = getServiceFactory();
    const preference = await telegramService.getPreference(session.user.email);

    if (!preference) {
      return notFound("Telegram preference not found");
    }

    return success(preference);
  } catch (error) {
    console.error("Error fetching Telegram preference:", error);
    return NextResponse.json(
      { error: "Failed to fetch preference" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/telegram/preferences
 * Register user for Telegram notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized();
    }

    const { telegramService } = getServiceFactory();
    const preference = await telegramService.registerUser(session.user.email);

    return success(preference, 201);
  } catch (error) {
    console.error("Error registering Telegram preference:", error);
    return NextResponse.json(
      { error: "Failed to register Telegram" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/telegram/preferences
 * Update Telegram preference (enable/disable, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorized();
    }

    const body = await request.json();

    const { telegramService } = getServiceFactory();
    const preference = await telegramService.getPreference(session.user.email);

    if (!preference) {
      return notFound("Telegram preference not found");
    }

    // TODO: Validate body against UpdateTelegramPreferenceInput schema

    // Only allow non-sensitive updates from the client
    const allowedUpdates = {
      ...(body.telegramEnabled !== undefined && {
        telegramEnabled: body.telegramEnabled,
      }),
    };

    const { telegramRepository } = getServiceFactory();
    const updated = await telegramRepository.updatePreference(
      preference.id,
      allowedUpdates
    );

    return success(updated);
  } catch (error) {
    console.error("Error updating Telegram preference:", error);
    return NextResponse.json(
      { error: "Failed to update preference" },
      { status: 500 }
    );
  }
}
