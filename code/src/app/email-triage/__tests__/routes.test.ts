import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { serviceMock, getServerSessionMock } = vi.hoisted(() => ({
  serviceMock: {
    startSession: vi.fn(),
    getSession: vi.fn(),
    getSessionItems: vi.fn(),
    listSessions: vi.fn(),
    executeSession: vi.fn(),
    overrideDecision: vi.fn(),
    overrideCategoryDecision: vi.fn(),
  },
  getServerSessionMock: vi.fn(),
}));

vi.mock("@/modules/email-triage/email-triage.repository", () => ({
  EmailTriageRepository: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/modules/email-triage/email-triage.service", () => ({
  EmailTriageService: vi.fn().mockImplementation(() => serviceMock),
}));

vi.mock("@/lib/adapters/mail/mail-imap.adapter", () => ({
  MailImapAdapter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { GET as listGet, POST as createPost } from "../../api/email-triage/route";
import { GET as detailGet } from "../../api/email-triage/[sessionId]/route";
import { POST as executePost } from "../../api/email-triage/[sessionId]/execute/route";
import { POST as overridePost } from "../../api/email-triage/[sessionId]/items/[itemId]/override/route";

function assertAuthenticated() {
  getServerSessionMock.mockResolvedValue({ user: { id: "admin" } });
}

const SESSION_ID = "session-1";
const ITEM_ID = "item-1";

describe("GET /api/email-triage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAuthenticated();
  });

  it("returns 200 with session list", async () => {
    serviceMock.listSessions.mockResolvedValue([
      { id: SESSION_ID, status: "DONE" },
    ]);

    const res = await listGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 500 on service error", async () => {
    serviceMock.listSessions.mockRejectedValue(new Error("DB down"));
    const res = await listGet();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/email-triage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAuthenticated();
  });

  it("returns 201 with sessionId", async () => {
    serviceMock.startSession.mockResolvedValue({ sessionId: SESSION_ID });

    const res = await createPost();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.sessionId).toBe(SESSION_ID);
  });

  it("returns 500 on service error", async () => {
    serviceMock.startSession.mockRejectedValue(new Error("IMAP down"));
    const res = await createPost();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/email-triage/[sessionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAuthenticated();
  });

  it("returns 200 with session and items", async () => {
    serviceMock.getSession.mockResolvedValue({
      id: SESSION_ID, status: "READY",
    });
    serviceMock.getSessionItems.mockResolvedValue([
      { id: ITEM_ID, uid: 101, effectiveDecision: "TRASH" },
    ]);

    const res = await detailGet(new Request("http://localhost/"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.session.id).toBe(SESSION_ID);
    expect(body.data.items).toHaveLength(1);
  });

  it("returns 404 when session not found", async () => {
    serviceMock.getSession.mockResolvedValue(null);

    const res = await detailGet(new Request("http://localhost/"), {
      params: Promise.resolve({ sessionId: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/email-triage/[sessionId]/execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAuthenticated();
  });

  it("returns 200 with execution result", async () => {
    serviceMock.getSession.mockResolvedValue({
      id: SESSION_ID, status: "READY",
    });
    serviceMock.executeSession.mockResolvedValue({ trashed: 5, errors: 0 });

    const res = await executePost(new Request("http://localhost/"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.trashed).toBe(5);
  });

  it("returns 404 when session not found", async () => {
    serviceMock.getSession.mockResolvedValue(null);

    const res = await executePost(new Request("http://localhost/"), {
      params: Promise.resolve({ sessionId: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when session not READY", async () => {
    serviceMock.getSession.mockResolvedValue({
      id: SESSION_ID, status: "PENDING",
    });

    const res = await executePost(new Request("http://localhost/"), {
      params: Promise.resolve({ sessionId: SESSION_ID }),
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/email-triage/[sessionId]/items/[itemId]/override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assertAuthenticated();
  });

  it("returns 200 with updated decision", async () => {
    const req = new NextRequest("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ decision: "KEEP" }),
    });

    const res = await overridePost(req, {
      params: Promise.resolve({ sessionId: SESSION_ID, itemId: ITEM_ID }),
    });
    expect(res.status).toBe(200);
    expect(serviceMock.overrideDecision).toHaveBeenCalledWith(ITEM_ID, "KEEP");
  });

  it("returns 400 with invalid decision", async () => {
    const req = new NextRequest("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ decision: "INVALID" }),
    });

    const res = await overridePost(req, {
      params: Promise.resolve({ sessionId: SESSION_ID, itemId: ITEM_ID }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when decision missing", async () => {
    const req = new NextRequest("http://localhost/", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await overridePost(req, {
      params: Promise.resolve({ sessionId: SESSION_ID, itemId: ITEM_ID }),
    });
    expect(res.status).toBe(400);
  });
});
