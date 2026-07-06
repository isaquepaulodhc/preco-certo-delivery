import { describe, expect, it } from "vitest";

import { isUserAdmin } from "@/lib/billing/admin";
import {
  getBillingPlan,
  getOfficialPlanAmount,
  getPlanDurationDays,
} from "@/lib/billing/plans";
import {
  approveManualPixPaymentRequest,
  buildManualPixPaymentRequest,
  canApprovePaymentRequest,
  formatPaymentReferenceCode,
  paymentRequestGrantsAccess,
} from "@/lib/billing/manual-pix";

describe("PIX manual", () => {
  it("gera codigo PCD formatado", () => {
    expect(formatPaymentReferenceCode(1)).toBe("PCD-00001");
    expect(formatPaymentReferenceCode(23)).toBe("PCD-00023");
  });

  it("rejeita plano invalido", () => {
    expect(() => buildManualPixPaymentRequest("enterprise")).toThrow(
      "Plano invalido.",
    );
  });

  it("usa valor oficial do plano, sem valor vindo do cliente", () => {
    expect(getOfficialPlanAmount("essential")).toBe(77);
    expect(getOfficialPlanAmount("pro")).toBe(87);
    expect(getOfficialPlanAmount("management")).toBe(97);
  });

  it("define labels e duracao oficial dos ciclos", () => {
    expect(getBillingPlan("essential")).toMatchObject({
      name: "Essencial Mensal",
      cycleLabel: "Mensal",
      durationDays: 30,
    });
    expect(getBillingPlan("pro")).toMatchObject({
      name: "Pro Trimestral",
      cycleLabel: "Trimestral",
      durationDays: 90,
    });
    expect(getBillingPlan("management")).toMatchObject({
      name: "Gestão Semestral",
      cycleLabel: "Semestral",
      durationDays: 180,
    });
    expect(getPlanDurationDays("pro")).toBe(90);
  });

  it("cria solicitacao pending sem liberar acesso", () => {
    const request = buildManualPixPaymentRequest("essential");

    expect(request).toMatchObject({
      planCode: "essential",
      amount: 77,
      durationDays: 30,
      status: "pending",
    });
    expect(paymentRequestGrantsAccess(request.status)).toBe(false);
  });

  it("solicitacao approved ativa assinatura", () => {
    expect(
      approveManualPixPaymentRequest({
        planCode: "essential",
        requestStatus: "pending",
        currentSubscription: { status: "expired", paid_until: "2026-07-02" },
        today: "2026-07-03",
      }),
    ).toEqual({
      status: "active",
      paid_until: "2026-08-02",
    });
  });

  it("aprovacao de cliente ativo soma a duracao do plano ao paid_until atual", () => {
    expect(
      approveManualPixPaymentRequest({
        planCode: "pro",
        requestStatus: "pending",
        currentSubscription: { status: "active", paid_until: "2026-08-10" },
        today: "2026-07-03",
      }),
    ).toEqual({
      status: "active",
      paid_until: "2026-11-08",
    });
  });

  it("aprovacao de Gestao libera 180 dias", () => {
    expect(
      approveManualPixPaymentRequest({
        planCode: "management",
        requestStatus: "pending",
        currentSubscription: { status: "expired", paid_until: "2026-07-02" },
        today: "2026-07-03",
      }),
    ).toEqual({
      status: "active",
      paid_until: "2026-12-30",
    });
  });

  it("impede dupla aprovacao", () => {
    expect(canApprovePaymentRequest("approved")).toBe(false);
    expect(() =>
      approveManualPixPaymentRequest({
        planCode: "essential",
        requestStatus: "approved",
        currentSubscription: { status: "active", paid_until: "2026-07-10" },
        today: "2026-07-03",
      }),
    ).toThrow("Apenas solicitacoes pendentes podem ser aprovadas.");
  });

  it("solicitacao cancelada ou rejeitada nao ativa assinatura", () => {
    expect(canApprovePaymentRequest("cancelled")).toBe(false);
    expect(canApprovePaymentRequest("rejected")).toBe(false);
    expect(paymentRequestGrantsAccess("cancelled")).toBe(false);
    expect(paymentRequestGrantsAccess("rejected")).toBe(false);
  });

  it("usuario comum nao e admin", () => {
    expect(isUserAdmin(null)).toBe(false);
    expect(isUserAdmin({ role: "customer" })).toBe(false);
  });
});
