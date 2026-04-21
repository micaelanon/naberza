import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

// Prevent multiple instances of Prisma Client in development
// (Next.js hot reload creates new module instances)
declare global {
  var prismaGlobal: PrismaClient | undefined; // NOSONAR
  var imapInitialized: boolean | undefined; // NOSONAR
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: env.isDev ? ["query", "error", "warn"] : ["error"],
    datasourceUrl: env.databaseUrl,
  });
}

export const prisma: PrismaClient = globalThis.prismaGlobal ?? createPrismaClient();

if (env.isDev) {
  globalThis.prismaGlobal = prisma;
}

// Schedule IMAP initialization for next tick (after Prisma client is ready)
if (!globalThis.imapInitialized) {
  globalThis.imapInitialized = true;
  // Use setImmediate to run after current event loop
  setImmediate(() => {
    initializeIMAPConnectionFromEnv().catch((err) => {
      console.error("[IMAP] ❌ Failed to initialize:", err.message);
    });
  });
}

async function initializeIMAPConnectionFromEnv(): Promise<void> {
  const host = process.env.MAIL_IMAP_HOST;
  const user = process.env.MAIL_IMAP_USER;
  const password = process.env.MAIL_IMAP_PASSWORD;

  // Only initialize if all required env vars are present
  if (!host || !user || !password) {
    console.log("[IMAP] ⏭️ Skipping: No IMAP credentials in .env.local");
    return;
  }

  try {
    const port = parseInt(process.env.MAIL_IMAP_PORT ?? "993", 10);
    const secure = process.env.MAIL_IMAP_SECURE !== "false";

    console.log("[IMAP] 🔍 Looking for existing IMAP connection...");

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
      console.log("[IMAP] ✅ Updated IMAP connection from .env.local");
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
    console.error(`[IMAP] ❌ Failed to initialize: ${message}`);
  }
}
