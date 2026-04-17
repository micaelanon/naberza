import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOn = vi.hoisted(() => vi.fn());
const mockEmit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/events", () => ({
  eventBus: {
    on: mockOn,
    emit: mockEmit,
  },
}));

import { NotificationRouter, registerNotificationSubscriptions } from "../notification-router";
import type { NotificationChannel, NotificationPayload, NotificationResult } from "../notification.types";

function makeChannel(id: string, fail = false): NotificationChannel {
  return {
    id,
    name: `Channel ${id}`,
    send: vi.fn().mockImplementation(async (): Promise<NotificationResult> => {
      if (fail) throw new Error("channel error");
      return { channelId: id, success: true, messageId: `msg-${id}` };
    }),
  };
}

describe("NotificationRouter", () => {
  describe("register / unregister / getChannels", () => {
    it("starts with no channels", () => {
      const router = new NotificationRouter();
      expect(router.getChannels()).toHaveLength(0);
    });

    it("registers a channel", () => {
      const router = new NotificationRouter();
      router.register(makeChannel("ch1"));
      expect(router.getChannels()).toHaveLength(1);
    });

    it("replaces channel with same id on re-register", () => {
      const router = new NotificationRouter();
      router.register(makeChannel("ch1"));
      router.register(makeChannel("ch1"));
      expect(router.getChannels()).toHaveLength(1);
    });

    it("unregisters a channel", () => {
      const router = new NotificationRouter();
      router.register(makeChannel("ch1"));
      router.register(makeChannel("ch2"));
      router.unregister("ch1");
      expect(router.getChannels()).toHaveLength(1);
      expect(router.getChannels()[0].id).toBe("ch2");
    });

    it("unregister on non-existent id is a no-op", () => {
      const router = new NotificationRouter();
      expect(() => router.unregister("does-not-exist")).not.toThrow();
    });
  });

  describe("send", () => {
    const payload = {
      subject: "Test subject",
      body: "Test body",
      level: "info" as const,
    } satisfies NotificationPayload;

    it("returns empty array when no channels registered", async () => {
      const router = new NotificationRouter();
      const results = await router.send(payload);
      expect(results).toHaveLength(0);
    });

    it("dispatches to all registered channels", async () => {
      const router = new NotificationRouter();
      const ch1 = makeChannel("ch1");
      const ch2 = makeChannel("ch2");
      router.register(ch1);
      router.register(ch2);
      const results = await router.send(payload);
      expect(results).toHaveLength(2);
      expect(ch1.send).toHaveBeenCalledWith(payload);
      expect(ch2.send).toHaveBeenCalledWith(payload);
    });

    it("returns success results from channels", async () => {
      const router = new NotificationRouter();
      router.register(makeChannel("ch1"));
      const results = await router.send(payload);
      expect(results[0]).toMatchObject({ channelId: "ch1", success: true });
    });

    it("catches error in one channel and continues with others", async () => {
      const router = new NotificationRouter();
      router.register(makeChannel("ch-fail", true));
      router.register(makeChannel("ch-ok"));
      const results = await router.send(payload);
      expect(results).toHaveLength(2);
      const failResult = results.find((r) => r.channelId === "ch-fail");
      const okResult = results.find((r) => r.channelId === "ch-ok");
      expect(failResult).toMatchObject({ success: false, error: "channel error" });
      expect(okResult).toMatchObject({ success: true });
    });
  });

  describe("registerNotificationSubscriptions", () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it("subscribes to automation.approval.requested", () => {
      registerNotificationSubscriptions();
      const subscribedEvents = mockOn.mock.calls.map((c) => c[0] as string);
      expect(subscribedEvents).toContain("automation.approval.requested");
    });

    it("subscribes to automation.approval.granted", () => {
      registerNotificationSubscriptions();
      const subscribedEvents = mockOn.mock.calls.map((c) => c[0] as string);
      expect(subscribedEvents).toContain("automation.approval.granted");
    });

    it("subscribes to automation.approval.denied", () => {
      registerNotificationSubscriptions();
      const subscribedEvents = mockOn.mock.calls.map((c) => c[0] as string);
      expect(subscribedEvents).toContain("automation.approval.denied");
    });

    it("subscribes to automation.action.executed", () => {
      registerNotificationSubscriptions();
      const subscribedEvents = mockOn.mock.calls.map((c) => c[0] as string);
      expect(subscribedEvents).toContain("automation.action.executed");
    });
  });
});
