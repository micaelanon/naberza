import { NextResponse } from "next/server";
import { HomeRepository } from "@/modules/home/home.repository";
import { HomeService } from "@/modules/home/home.service";

const repository = new HomeRepository();
const service = new HomeService(repository);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const event = await service.acknowledgeEvent(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    return NextResponse.json({ data: event });
  } catch (error) {
    console.error("[Home API] POST /home/api/events/[id]/acknowledge:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
