import { describe, it, expect } from "vitest";
import { extractUnsubscribeLink } from "../mail-analysis";

describe("extractUnsubscribeLink", () => {
  it("returns undefined for null body", () => {
    expect(extractUnsubscribeLink(null)).toBeUndefined();
  });

  it("extracts from List-Unsubscribe header", () => {
    const body = `From: newsletter@example.com
Subject: Weekly deals
List-Unsubscribe: <https://example.com/unsub?id=123>
Content-Type: text/plain

Some content here`;

    expect(extractUnsubscribeLink(body)).toBe("https://example.com/unsub?id=123");
  });

  it("returns undefined when List-Unsubscribe points to mailto", () => {
    const body = `From: test@example.com
List-Unsubscribe: <mailto:unsub@example.com>
Subject: Test`;

    expect(extractUnsubscribeLink(body)).toBeUndefined();
  });

  it("extracts https link near 'unsubscribe' text in HTML body", () => {
    const body = `<html><body>
      <a href="https://newsletter.example.com/unsub?token=abc">Unsubscribe</a>
      <p>Some content</p>
    </body></html>`;

    expect(extractUnsubscribeLink(body)).toBe("https://newsletter.example.com/unsub?token=abc");
  });

  it("finds 'darse de baja' link", () => {
    const body = `<html><body>
      <p>If you want to <a href="https://example.com/baja">darse de baja</a></p>
    </body></html>`;

    expect(extractUnsubscribeLink(body)).toBe("https://example.com/baja");
  });

  it("returns undefined for non-https unsubscribe links", () => {
    const body = `<a href="http://not-secure.example.com/unsub">Unsubscribe</a>`;

    expect(extractUnsubscribeLink(body)).toBeUndefined();
  });

  it("returns undefined when no unsubscribe link present", () => {
    const body = "This is just a regular email with no unsubscribe link.";

    expect(extractUnsubscribeLink(body)).toBeUndefined();
  });
});
