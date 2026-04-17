import { NextResponse } from "next/server";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { InvoiceService } from "@/modules/invoices/invoice.service";

const repository = new InvoiceRepository();
const service = new InvoiceService(repository);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const invoice = await service.markPaid(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error("[Invoices API] POST /invoices/api/[id]/pay:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
