import { NextResponse } from "next/server";
import { InvoiceRepository } from "@/modules/invoices/invoice.repository";
import { InvoiceService } from "@/modules/invoices/invoice.service";

const repository = new InvoiceRepository();
const service = new InvoiceService(repository);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const invoice = await service.getInvoice(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error("[Invoices API] GET /invoices/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
