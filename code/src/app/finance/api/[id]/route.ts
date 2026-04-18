import { NextResponse } from "next/server";
import { FinanceRepository } from "@/modules/finance/finance.repository";
import { FinanceService } from "@/modules/finance/finance.service";

const repository = new FinanceRepository();
const service = new FinanceService(repository);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const entry = await service.getEntry(id);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("[Finance API] GET /finance/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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

  try {
    const entry = await service.updateEntry(id, body);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ data: entry });
  } catch (error) {
    console.error("[Finance API] PATCH /finance/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await service.deleteEntry(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    console.error("[Finance API] DELETE /finance/api/[id]:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
