// Webhook token validation utilities
// Tokens are stored as WEBHOOK_TOKENS env var (comma-separated) or via individual WEBHOOK_TOKEN_* vars

export function getValidTokens(): Set<string> {
  const tokens = new Set<string>();

  // Support WEBHOOK_TOKENS=token1,token2,token3
  const multi = process.env.WEBHOOK_TOKENS;
  if (multi) {
    multi.split(",").forEach((t) => {
      const trimmed = t.trim();
      if (trimmed) tokens.add(trimmed);
    });
  }

  return tokens;
}

export function isValidWebhookToken(token: string): boolean {
  if (!token) return false;
  const valid = getValidTokens();
  // If no tokens configured, all webhooks are rejected for safety
  if (valid.size === 0) return false;
  return valid.has(token);
}
