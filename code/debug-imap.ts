/**
 * Debug script to verify IMAP connection and emails
 * Run: npx ts-node debug-imap.ts
 */

import { MailImapAdapter } from "./src/lib/adapters/mail/mail-imap.adapter";

async function debugIMAP() {
  const host = process.env.MAIL_IMAP_HOST;
  const user = process.env.MAIL_IMAP_USER;
  const password = process.env.MAIL_IMAP_PASSWORD;
  const port = parseInt(process.env.MAIL_IMAP_PORT ?? "993", 10);

  if (!host || !user || !password) {
    console.error("❌ Missing IMAP credentials in .env.local");
    process.exit(1);
  }

  console.log(`\n🔍 Connecting to IMAP...`);
  console.log(`   Host: ${host}`);
  console.log(`   User: ${user}`);
  console.log(`   Port: ${port}\n`);

  const adapter = new MailImapAdapter({
    id: "debug-imap",
    name: "Debug IMAP",
    type: "email_imap",
    status: "ACTIVE",
    permissions: { read: true, write: false },
    config: {
      host,
      port,
      user,
      password,
      secure: true,
      mailbox: "INBOX",
    },
  });

  try {
    // Test connection
    console.log("📡 Testing connection...");
    const health = await adapter.testConnection();
    console.log(
      `✅ Connection successful! Latency: ${health.latencyMs}ms\n`
    );

    // Fetch emails from last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log(`📬 Fetching emails since ${since.toISOString()}...\n`);

    const emails = await adapter.fetchNewMessages(since);
    console.log(`📊 Total emails fetched: ${emails.length}\n`);

    if (emails.length === 0) {
      console.log("⚠️  No emails found in INBOX from last 30 days!");
      process.exit(0);
    }

    // Show all emails with details
    console.log("=== ALL EMAILS ===\n");
    emails.forEach((email, idx) => {
      console.log(`${idx + 1}. [${email.uid}] ${email.subject}`);
      console.log(`   From: ${email.from}`);
      console.log(`   Date: ${email.date.toISOString()}`);
      console.log(`   Read: ${email.isRead}`);
      console.log(`   Body preview: ${email.body?.substring(0, 80)}`);
      console.log();
    });

    // Search for Todoist emails
    console.log("\n=== TODOIST EMAILS ===\n");
    const todoistEmails = emails.filter(
      (e) =>
        e.from.toLowerCase().includes("todoist") ||
        e.subject.toLowerCase().includes("todoist")
    );

    if (todoistEmails.length === 0) {
      console.log("❌ No Todoist emails found!");
      console.log(
        "   Available senders:",
        [...new Set(emails.map((e) => e.from))].slice(0, 10).join(", ")
      );
    } else {
      console.log(`✅ Found ${todoistEmails.length} Todoist emails:\n`);
      todoistEmails.forEach((email) => {
        console.log(`  - ${email.subject}`);
        console.log(`    From: ${email.from}`);
      });
    }

    // Search for news@todoist.com specifically
    console.log("\n=== SEARCH: news@todoist.com ===\n");
    const newsEmails = emails.filter(
      (e) => e.from.toLowerCase() === "news@todoist.com"
    );
    console.log(`Found ${newsEmails.length} emails from news@todoist.com\n`);

    if (newsEmails.length > 0) {
      newsEmails.slice(0, 3).forEach((email) => {
        console.log(`  📧 ${email.subject}`);
        console.log(`     Date: ${email.date.toISOString()}`);
        console.log(`     UID: ${email.uid}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

debugIMAP().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
