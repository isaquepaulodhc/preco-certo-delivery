import { describe, expect, it } from "vitest";

import { isUserAdmin } from "@/lib/billing/admin";
import { getOfficialPlanAmount } from "@/lib/billing/plans";
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
    expect(getOfficialPlanAmount("essential")).toBe(39);
    expect(getOfficialPlanAmount("pro")).toBe(79);
    expect(getOfficialPlanAmount("management")).toBe(149);
  });

  it("cria solicitacao pending sem liberar acesso", () => {
    const request = buildManualPixPaymentRequest("essential");

    expect(request).toMatchObject({
      planCode: "essential",
      amount: 39,
      status: "pending",
    });
    expect(paymentRequestGrantsAccess(request.status)).toBe(false);
  });

  it("solicitacao approved ativa assinatura", () => {
    expect(
      approveManualPixPaymentRequest({
        requestStatus: "pending",
        currentSubscription: { status: "expired", paid_until: "2026-07-02" },
        today: "2026-07-03",
      }),
    ).toEqual({
      status: "active",
      paid_until: "2026-08-02",
    });
  });

  it("impede dupla aprovacao", () => {
    expect(canApprovePaymentRequest("approved")).toBe(false);
    expect(() =>
      approveManualPixPaymentRequest({
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
