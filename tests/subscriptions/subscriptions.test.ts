import { describe, expect, it } from "vitest";

import {
  calculateNextPaidUntil,
  calculateRemainingDays,
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

  it("libera paid_until hoje", () => {
    expect(
      hasActiveAccess({ status: "active", paid_until: "2026-07-03" }, "2026-07-03"),
    ).toBe(true);
  });

  it("bloqueia pending", () => {
    expect(
      hasActiveAccess(
        { status: "pending" as never, paid_until: "2026-07-10" },
        "2026-07-03",
      ),
    ).toBe(false);
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

describe("dias e renovacao de assinatura", () => {
  it("calcula dias restantes", () => {
    expect(calculateRemainingDays("2026-07-10", "2026-07-03")).toBe(7);
  });

  it("retorna zero quando paid_until esta vencido", () => {
    expect(calculateRemainingDays("2026-07-02", "2026-07-03")).toBe(0);
  });

  it("retorna zero quando paid_until e hoje", () => {
    expect(calculateRemainingDays("2026-07-03", "2026-07-03")).toBe(0);
  });

  it("estende paid_until quando assinatura ainda esta ativa", () => {
    expect(
      calculateNextPaidUntil(
        { status: "active", paid_until: "2026-07-10" },
        "2026-07-03",
      ),
    ).toBe("2026-08-09");
  });

  it("usa hoje mais 30 dias quando assinatura esta expirada", () => {
    expect(
      calculateNextPaidUntil(
        { status: "expired", paid_until: "2026-07-02" },
        "2026-07-03",
      ),
    ).toBe("2026-08-02");
  });
});
