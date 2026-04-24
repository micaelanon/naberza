/**
 * Next.js instrumentation hook — runs once at server startup.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * We use this to bootstrap application-level subscriptions so they are
 * registered before any request is served. The `nodejs` runtime guard
 * ensures we don't attempt Prisma or event bus calls in the Edge runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { bootstrap } = await import("@/lib/bootstrap");
    bootstrap();
  } catch (error) {
    console.error("[Instrumentation] bootstrap failed", error);
  }
}
