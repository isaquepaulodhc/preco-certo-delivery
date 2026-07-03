import type { SubscriptionLike } from "@/types/domain";

function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

export function hasActiveAccess(
  subscription: SubscriptionLike | null | undefined,
  today: string | Date = new Date(),
) {
  if (!subscription?.paid_until) {
    return false;
  }

  const statusAllowsAccess =
    subscription.status === "trial" || subscription.status === "active";

  return statusAllowsAccess && toDateOnly(subscription.paid_until) >= toDateOnly(today);
}

export function getEffectiveSubscriptionStatus(
  subscription: SubscriptionLike | null | undefined,
  today: string | Date = new Date(),
) {
  if (!subscription) {
    return "missing";
  }

  if (hasActiveAccess(subscription, today)) {
    return "active";
  }

  if (subscription.status === "trial" || subscription.status === "active") {
    return "expired";
  }

  return subscription.status;
}
