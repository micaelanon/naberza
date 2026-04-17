import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { InvoiceService } from "@/modules/invoices/invoice.service";
import type { InvoiceStatus } from "@/modules/invoices";

const repository = new InvoiceRepository();
const service = new InvoiceService(repository);

const VALID_STATUSES = new Set<InvoiceStatus>(["PENDING", "PAID", "OVERDUE", "DISPUTED", "CANCELLED"]);

function parseStatus(raw: string | null): InvoiceStatus | undefined {
  if (raw && VALID_STATUSES.has(raw as InvoiceStatus)) return raw as InvoiceStatus;
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = parseStatus(searchParams.get("status"));
  const search = searchParams.get("search") ?? undefined;
  const isRecurring = searchParams.has("recurring") ? searchParams.get("recurring") === "true" : undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  try {
    const result = await service.listInvoices({ status, search, isRecurring, limit, offset });
    return NextResponse.json({ data: result.items, total: result.total });
  } catch (error) {
    console.error("[Invoices API] GET /invoices/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function validateCreateBody(
  body: Record<string, unknown>,
): string | null {
  if (typeof body.issuer !== "string" || !body.issuer.trim()) return "issuer is required";
  if (typeof body.amount !== "number" || body.amount <= 0) return "amount must be a positive number";
  if (typeof body.issueDate !== "string" || !body.issueDate) return "issueDate is required";
  return null;
}

function buildCreateInput(body: Record<string, unknown>) {
  return {
    issuer: (body.issuer as string).trim(),
    amount: body.amount as number,
    currency: typeof body.currency === "string" ? body.currency : undefined,
    issueDate: new Date(body.issueDate as string),
    dueDate: typeof body.dueDate === "string" ? new Date(body.dueDate) : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    isRecurring: typeof body.isRecurring === "boolean" ? body.isRecurring : undefined,
    documentId: typeof body.documentId === "string" ? body.documentId : undefined,
    inboxItemId: typeof body.inboxItemId === "string" ? body.inboxItemId : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
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
    const invoice = await service.createInvoice(buildCreateInput(body));
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    console.error("[Invoices API] POST /invoices/api:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
