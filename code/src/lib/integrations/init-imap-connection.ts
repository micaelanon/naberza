/**
 * Initialize IMAP connection from environment variables
 *
 * This runs on app startup and creates/updates the IMAP connection
 * in the database from .env.local configuration (if present).
 *
 * Allows zero-config IMAP for development without UI setup.
 */

import { prisma } from "@/lib/db";

export async function initializeIMAPConnectionFromEnv(): Promise<void> {
  const host = process.env.MAIL_IMAP_HOST;
  const user = process.env.MAIL_IMAP_USER;
  const password = process.env.MAIL_IMAP_PASSWORD;

  // Only initialize if all required env vars are present
  if (!host || !user || !password) {
    return;
  }

  try {
    const port = parseInt(process.env.MAIL_IMAP_PORT ?? "993", 10);
    const secure = process.env.MAIL_IMAP_SECURE !== "false";

    // Check if IMAP connection already exists
    const existing = await prisma.sourceConnection.findFirst({
      where: {
        type: "EMAIL_IMAP",
      },
    });

    // Build IMAP config
    const config = {
      host,
      port,
      secure,
      user,
      password,
      mailbox: process.env.MAIL_IMAP_MAILBOX ?? "INBOX",
    };

    if (existing) {
      // Update existing connection with new config
      await prisma.sourceConnection.update({
        where: { id: existing.id },
        data: {
          config,
          status: "ACTIVE",
          lastError: null,
        },
      });
      console.log("[IMAP] ✅ Updated existing IMAP connection from .env.local");
    } else {
      // Create new connection from env
      await prisma.sourceConnection.create({
        data: {
          id: `imap-env-${Date.now()}`,
          name: "IMAP (from .env.local)",
          type: "EMAIL_IMAP",
          status: "ACTIVE",
          config,
          permissionRead: true,
          permissionWrite: true,
        },
      });
      console.log("[IMAP] ✅ Created IMAP connection from .env.local");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[IMAP] ❌ Failed to initialize IMAP from .env.local:", message);
    // Don't throw - let the app continue, user can configure via UI
  }
}
