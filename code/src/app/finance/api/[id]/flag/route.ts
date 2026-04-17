import { NextResponse } from "next/server";
import { FinanceRepository } from "@/modules/finance/finance.repository";
import { FinanceService } from "@/modules/finance/finance.service";

const repository = new FinanceRepository();
const service = new FinanceService(repository);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.reason !== "string" || !body.reason.trim()) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  try {
    const entry = await service.flagAnomaly(id, body.reason.trim());
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("[Finance API] POST /finance/api/[id]/flag:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
