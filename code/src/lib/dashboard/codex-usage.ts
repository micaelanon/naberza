import { readFileSync } from "fs";
import { homedir } from "os";

import { env } from "@/lib/env";

export interface CodexWindow {
  usedPercent: number;
  resetAfterSeconds: number;
}

export interface CodexUsage {
  planType: string;
  userEmail: string;
  primaryWindow: CodexWindow;
  secondaryWindow: CodexWindow;
}

const DEFAULT_AUTH_PATH = `${homedir()}/.openclaw/agents/main/agent/harness-auth/codex/06bfb5171eff0241/auth.json`;

function readToken(): string | null {
  const path = env.openclawCodexAuthPath ?? DEFAULT_AUTH_PATH;
  try {
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const token = data["accessToken"] ?? data["token"] ?? data["access_token"];
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

interface RawWindow { used_percent?: number; reset_after_seconds?: number }
interface RawUsage {
  plan_type?: string;
  user_email?: string;
  rate_limit?: { primary_window?: RawWindow; secondary_window?: RawWindow };
}

function parseWindow(raw: RawWindow): CodexWindow {
  return {
    usedPercent: raw.used_percent ?? 0,
    resetAfterSeconds: raw.reset_after_seconds ?? 0,
  };
}

function parseUsage(body: RawUsage): CodexUsage | null {
  const primary = body.rate_limit?.primary_window;
  const secondary = body.rate_limit?.secondary_window;
  if (!primary || !secondary) return null;
  return {
    planType: body.plan_type ?? "pro",
    userEmail: body.user_email ?? "",
    primaryWindow: parseWindow(primary),
    secondaryWindow: parseWindow(secondary),
  };
}

async function fetchUsage(token: string): Promise<CodexUsage | null> {
  const res = await fetch("https://chatgpt.com/backend-api/wham/usage", {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return parseUsage(await res.json() as RawUsage);
}

export async function getCodexUsage(): Promise<CodexUsage | null> {
  const token = readToken();
  if (!token) return null;
  try {
    return await fetchUsage(token);
  } catch {
    return null;
  }
}
