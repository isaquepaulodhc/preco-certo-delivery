import { describe, expect, it } from "vitest";

import {
  getEffectiveSubscriptionStatus,
  hasActiveAccess,
} from "@/lib/auth/subscriptions";

describe("hasActiveAccess", () => {
  it("libera trial valido", () => {
    expect(
      hasActiveAccess({ status: "trial", paid_until: "2026-07-10" }, "2026-07-03"),
    ).toBe(true);
  });

  it("libera active valido", () => {
    expect(
      hasActiveAccess({ status: "active", paid_until: "2026-07-10" }, "2026-07-03"),
    ).toBe(true);
  });

  it("bloqueia paid_until vencido", () => {
    expect(
      hasActiveAccess({ status: "active", paid_until: "2026-07-02" }, "2026-07-03"),
    ).toBe(false);
  });

  it("bloqueia blocked", () => {
    expect(
      hasActiveAccess({ status: "blocked", paid_until: "2026-07-10" }, "2026-07-03"),
    ).toBe(false);
  });

  it("bloqueia cancelled", () => {
    expect(
      hasActiveAccess({ status: "cancelled", paid_until: "2026-07-10" }, "2026-07-03"),
    ).toBe(false);
  });

  it("exibe vencido quando status cru ainda permite acesso mas a data passou", () => {
    expect(
      getEffectiveSubscriptionStatus(
        { status: "trial", paid_until: "2026-07-02" },
        "2026-07-03",
      ),
    ).toBe("expired");
  });
});
