import { NextResponse } from "next/server";
import { DocumentRepository } from "@/modules/documents/document.repository";
import { DocumentService } from "@/modules/documents/document.service";

const repository = new DocumentRepository();
const service = new DocumentService(repository);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const document = await service.getDocument(id);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ data: document });
  } catch (error) {
    console.error("[Documents API] GET /documents/api/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
