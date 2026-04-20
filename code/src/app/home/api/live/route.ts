import { NextResponse } from "next/server";
import { HomeAssistantAdapter } from "@/lib/adapters/home-assistant";
import { env } from "@/lib/env";
import { buildHomeLiveOverview } from "@/modules/home";
import type { HomeLiveOverview } from "@/modules/home";

interface HomeLiveResponse {
  configured: boolean;
  connected: boolean | null;
  error?: string;
  overview: HomeLiveOverview;
}

function emptyOverview(): HomeLiveOverview {
  return {
    generatedAt: new Date().toISOString(),
    totalStates: 0,
    attentionItems: [],
    locks: [],
    accessPoints: [],
    sensors: [],
  };
}

export async function GET(): Promise<NextResponse<HomeLiveResponse>> {
  if (!env.homeAssistantUrl || !env.homeAssistantToken) {
    return NextResponse.json({
      configured: false,
      connected: null,
      overview: emptyOverview(),
    });
  }

  try {
    const adapter = new HomeAssistantAdapter({
      id: "ha-live",
      name: "Home Assistant",
      type: "home_assistant",
      status: "active",
      permissions: { read: true, write: false },
      config: {
        baseUrl: env.homeAssistantUrl,
        token: env.homeAssistantToken,
      },
    });

    const states = await adapter.getStates();

    return NextResponse.json({
      configured: true,
      connected: true,
      overview: buildHomeLiveOverview(states),
    });
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      error: error instanceof Error ? error.message : "No se pudo consultar Home Assistant",
      overview: emptyOverview(),
    });
  }
}
