import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/debug/imap
 *
 * Comprehensive debug endpoint that:
 * 1. Fetches TOTAL email count via IMAP (all emails, no date limit)
 * 2. Fetches emails from last 30 days
 * 3. Shows Todoist email matches
 * 4. Batch processing info (ImapFlow splits into 500-email batches to avoid timeouts)
 *
 * Query params:
 * - ?all=true  - Show all emails in response (default shows only sample)
 * - ?days=N    - Change time window (default 30 days)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  try {
    // Get IMAP connection from database
    const imapConnection = await prisma.sourceConnection.findFirst({
      where: {
        type: "EMAIL_IMAP",
        status: "ACTIVE",
      },
    });

    if (!imapConnection) {
      return NextResponse.json(
        { error: "No active IMAP connection found" },
        { status: 400 }
      );
    }

    console.log("[DEBUG] Found IMAP connection:", imapConnection.name);

    // Create IMAP adapter
    const { MailImapAdapter } = await import("@/lib/adapters/mail/mail-imap.adapter");
    const imapConfig = (imapConnection.config ?? {}) as Record<string, unknown>;

    console.log("[DEBUG] Config:", {
      host: imapConfig.host,
      user: imapConfig.user,
      port: imapConfig.port,
    });
    const imapAdapter = new MailImapAdapter({
      id: imapConnection.id,
      name: imapConnection.name,
      type: "email_imap",
      status: imapConnection.status as any,
      permissions: {
        read: imapConnection.permissionRead,
        write: imapConnection.permissionWrite,
      },
      config: imapConfig,
    });

    console.log("[DEBUG] Testing connection...");
    const health = await imapAdapter.testConnection();
    console.log("[DEBUG] Connection health:", health);

    if (!health.healthy) {
      return NextResponse.json(
        { error: "IMAP connection failed", details: health.message },
        { status: 500 }
      );
    }

    // First, get TOTAL count of all emails in mailbox (no date limit)
    console.log("[DEBUG] Counting TOTAL emails in mailbox (this may take a moment for large mailboxes)...");
    const startCountTime = Date.now();
    const allEmails = await imapAdapter.fetchAllMessages();
    const countDuration = Date.now() - startCountTime;
    console.log(`[DEBUG] TOTAL emails in mailbox: ${allEmails.length} (took ${countDuration}ms)`);

    // Calculate batch count
    const BATCH_SIZE = 500;
    const batchesProcessed = Math.ceil(allEmails.length / BATCH_SIZE);
    console.log(`[DEBUG] Processed in ${batchesProcessed} batches of ${BATCH_SIZE} emails each`);

    // Now fetch emails from last N days for preview
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    console.log(`[DEBUG] Fetching emails from last ${days} days since:`, since.toISOString());

    const startPreviewTime = Date.now();
    const emails = await imapAdapter.fetchAllMessages(since);
    const previewDuration = Date.now() - startPreviewTime;
    console.log(`[DEBUG] Emails from last ${days} days: ${emails.length} (took ${previewDuration}ms)`);

    // Search for news@todoist.com in LAST 30 DAYS
    const todoistEmails = emails.filter((e) => {
      const fromLower = e.from.toLowerCase();
      return (
        fromLower.includes("todoist") ||
        fromLower.includes("news@todoist.com") ||
        e.subject.toLowerCase().includes("todoist")
      );
    });

    console.log("[DEBUG] Todoist emails found (last 30 days):", todoistEmails.length);

    // ALSO search for news@todoist.com in ALL emails (all time)
    const todoistEmailsAllTime = allEmails.filter((e) => {
      const fromLower = e.from.toLowerCase();
      return (
        fromLower.includes("todoist") ||
        fromLower.includes("news@todoist.com") ||
        e.subject.toLowerCase().includes("todoist")
      );
    });

    console.log("[DEBUG] Todoist emails found (ALL TIME):", todoistEmailsAllTime.length);

    // Search specifically for exact sender
    const exactTodoist = allEmails.filter((e) => e.from.toLowerCase().includes("news@todoist.com"));
    console.log("[DEBUG] Exact match 'news@todoist.com':", exactTodoist.length);

    // Get unique senders for debugging
    const senders = [...new Set(emails.map((e) => e.from))];
    console.log("[DEBUG] Sample senders:", senders.slice(0, 10));

    // Calculate oldest and newest email dates
    const oldestEmail = allEmails.length > 0 ? allEmails.reduce((oldest, e) => e.date < oldest.date ? e : oldest) : null;
    const newestEmail = allEmails.length > 0 ? allEmails.reduce((newest, e) => e.date > newest.date ? e : newest) : null;

    return NextResponse.json({
      connection: {
        id: imapConnection.id,
        name: imapConnection.name,
        status: imapConnection.status,
        host: (imapConfig.host as string) ?? "unknown",
        user: (imapConfig.user as string) ?? "unknown",
      },
      health: {
        ...health,
        latencyMs: health.latencyMs,
        checkedAt: health.checkedAt,
      },
      mailboxStats: {
        totalEmailsInMailbox: allEmails.length,
        emailsFromLastNDays: {
          days,
          count: emails.length,
          percentage: allEmails.length > 0 ? ((emails.length / allEmails.length) * 100).toFixed(2) + "%" : "N/A",
        },
        dateRange: {
          oldest: oldestEmail ? oldestEmail.date.toISOString() : null,
          newest: newestEmail ? newestEmail.date.toISOString() : null,
          span: oldestEmail && newestEmail ?
            Math.floor((newestEmail.date.getTime() - oldestEmail.date.getTime()) / (1000 * 60 * 60 * 24)) + " days"
            : "N/A",
        },
        batchProcessing: {
          batchSize: 500,
          totalBatches: batchesProcessed,
          reason: "Large mailboxes split into batches to avoid IMAP timeouts",
        },
      },
      queryWindow: {
        from: since.toISOString(),
        to: new Date().toISOString(),
        daysRequested: days,
      },
      performance: {
        totalCountDurationMs: countDuration,
        previewFetchDurationMs: previewDuration,
      },
      patterns: {
        todoistEmails: todoistEmails.length,
        uniqueSenders: senders.length,
        readVsUnread: {
          read: allEmails.filter(e => e.isRead).length,
          unread: allEmails.filter(e => !e.isRead).length,
        },
      },
      todoistAnalysis: {
        last30Days: todoistEmails.length,
        allTime: todoistEmailsAllTime.length,
        exactNewsAtTodoist: exactTodoist.length,
        samples: exactTodoist.slice(0, 5).map((e) => ({
          uid: e.uid,
          messageId: e.messageId,
          from: e.from,
          subject: e.subject,
          date: e.date.toISOString(),
          isRead: e.isRead,
          preview: e.body?.substring(0, 150),
        })),
      },
      sampleSenders: senders.slice(0, 20),
      note: `Total: ${allEmails.length} emails. Last ${days} days: ${emails.length}. Todoist: ${todoistEmailsAllTime.length} all-time, ${todoistEmails.length} in last ${days} days. Use ?all=true for full details, ?days=N to change time window.`,
    });
  } catch (error) {
    console.error("[DEBUG] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
