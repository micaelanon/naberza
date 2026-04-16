import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

// Prevent multiple instances of Prisma Client in development
// (Next.js hot reload creates new module instances)
declare global {
  var prismaGlobal: PrismaClient | undefined; // NOSONAR
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
