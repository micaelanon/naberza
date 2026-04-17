import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FinanceRepository } from "@/modules/finance/finance.repository";
import { FinanceService } from "@/modules/finance/finance.service";
import type { FinancialEntryType } from "@/modules/finance";

const repository = new FinanceRepository();
const service = new FinanceService(repository);

const VALID_TYPES = new Set<FinancialEntryType>([
  "INCOME",
  "EXPENSE",
  "BALANCE_SNAPSHOT",
  "RECURRING_CHARGE",
]);

function parseType(raw: string | null): FinancialEntryType | undefined {
  if (raw && VALID_TYPES.has(raw as FinancialEntryType)) return raw as FinancialEntryType;
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = parseType(searchParams.get("type"));
  const isAnomaly = searchParams.has("anomaly") ? searchParams.get("anomaly") === "true" : undefined;
  const search = searchParams.get("search") ?? undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listEntries({ type, isAnomaly, search, from, to, limit, offset });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Finance API] GET /finance/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function validateCreateBody(body: Record<string, unknown>): string | null {
  if (!body.type || !VALID_TYPES.has(body.type as FinancialEntryType)) return "type is required and must be valid";
  if (typeof body.amount !== "number" || body.amount <= 0) return "amount must be a positive number";
  if (typeof body.date !== "string" || !body.date) return "date is required";
  return null;
}

function buildCreateInput(body: Record<string, unknown>) {
  return {
    type: body.type as FinancialEntryType,
    amount: body.amount as number,
    currency: typeof body.currency === "string" ? body.currency : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    date: new Date(body.date as string),
    invoiceId: typeof body.invoiceId === "string" ? body.invoiceId : undefined,
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = validateCreateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const entry = await service.createEntry(buildCreateInput(body));
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("[Finance API] POST /finance/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
