import {
  calculateNextPaidUntil,
  type SubscriptionAccessLike,
} from "@/lib/auth/subscriptions";
import { assertBillingPlan } from "@/lib/billing/plans";

export type PaymentRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export function formatPaymentReferenceCode(sequence: number) {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error("Sequencia invalida.");
  }

  return `PCD-${String(sequence).padStart(5, "0")}`;
}

export function paymentRequestGrantsAccess(status: PaymentRequestStatus) {
  void status;

  return false;
}

export function canApprovePaymentRequest(status: PaymentRequestStatus) {
  return status === "pending";
}

export function canCancelPaymentRequest(status: PaymentRequestStatus) {
  return status === "pending";
}

export function buildManualPixPaymentRequest(planCode: string) {
  const plan = assertBillingPlan(planCode);

  return {
    planCode: plan.code,
    planName: plan.name,
    amount: plan.price,
    status: "pending" as const,
  };
}

export function approveManualPixPaymentRequest({
  requestStatus,
  currentSubscription,
  today,
}: {
  requestStatus: PaymentRequestStatus;
  currentSubscription: SubscriptionAccessLike | null | undefined;
  today: string | Date;
}) {
  if (!canApprovePaymentRequest(requestStatus)) {
    throw new Error("Apenas solicitacoes pendentes podem ser aprovadas.");
  }

  return {
    status: "active" as const,
    paid_until: calculateNextPaidUntil(currentSubscription, today, 30),
  };
}
