import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { TelegramNotificationChannel } from "@/lib/adapters/notification/telegram.adapter";

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

async function buildTaskSection(now: Date): Promise<string[]> {
  const tasks = await prisma.task.findMany({
    where: { status: "PENDING" as never, dueAt: { lt: now } },
    orderBy: { dueAt: "asc" }, take: 10,
  });
  if (tasks.length === 0) return [];
  const lines = [`<b>⏰ Tareas vencidas (${tasks.length})</b>`];
  for (const task of tasks) {
    const due = task.dueAt ? ` (${formatDate(task.dueAt)})` : "";
    lines.push(`• ${task.title}${due}`);
  }
  lines.push("");
  return lines;
}

async function buildInvoiceSection(until: Date): Promise<string[]> {
  const invoices = await prisma.invoice.findMany({
    where: { status: "PENDING" as never, dueDate: { lte: until } },
    orderBy: { dueDate: "asc" }, take: 10,
  });
  if (invoices.length === 0) return [];
  const lines = [`<b>💰 Facturas pendientes (${invoices.length})</b>`];
  for (const inv of invoices) {
    const due = inv.dueDate ? ` (vence ${formatDate(inv.dueDate)})` : "";
    lines.push(`• ${inv.issuer} — ${inv.amount.toString()} ${inv.currency}${due}`);
  }
  lines.push("");
  return lines;
}

async function buildSubscriptionSection(now: Date, until: Date): Promise<string[]> {
  const subs = await prisma.subscription.findMany({
    where: { status: "ACTIVE" as never, nextRenewalAt: { lte: until, gte: now } },
    orderBy: { nextRenewalAt: "asc" },
  });
  if (subs.length === 0) return [];
  const lines = [`<b>🔄 Suscripciones que renuevan</b>`];
  for (const sub of subs) {
    lines.push(`• ${sub.name} — ${sub.amount.toString()} ${sub.currency} (${formatDate(sub.nextRenewalAt)})`);
  }
  lines.push("");
  return lines;
}

async function buildEmailSection(): Promise<string[]> {
  const count = await prisma.inboxItem.count({
    where: { sourceType: "EMAIL" as never, status: "PENDING" as never },
  });
  if (count === 0) return [];
  return [`<b>📧 Correos sin procesar: ${count}</b>\n`];
}

async function buildDigestBody(): Promise<string> {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);
  const sections: string[] = [
    `📬 <b>Resumen semanal Naberza</b>\n📅 ${formatDate(now)}\n`,
    ...(await buildTaskSection(now)),
    ...(await buildInvoiceSection(weekFromNow)),
    ...(await buildSubscriptionSection(now, weekFromNow)),
    ...(await buildEmailSection()),
  ];
  return sections.join("\n");
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronToken = env.digestCronToken;

  if (cronToken && authHeader !== `Bearer ${cronToken}`) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await buildDigestBody();
    const telegram = new TelegramNotificationChannel();
    const result = await telegram.send({
      subject: "Resumen semanal Naberza",
      body,
      level: "info",
    });

    if (!result.success) {
      console.error("[Digest] Telegram send failed:", result.error);
      return NextResponse.json({ error: "Failed to send digest", detail: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: { sent: true, messageId: result.messageId } });
  } catch (error) {
    console.error("[Digest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
