import type { SubscriptionLike } from "@/types/domain";

export type SubscriptionAccessLike = SubscriptionLike;

function toDateOnly(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function dateOnlyToUtcTime(value: string | Date) {
  const dateOnly = toDateOnly(value);
  const [year, month, day] = dateOnly.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

export function addDaysToDateOnly(value: string | Date, days: number) {
  const date = new Date(dateOnlyToUtcTime(value));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
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

export function calculateRemainingDays(
  paidUntil: string | Date | null | undefined,
  today: string | Date = new Date(),
) {
  if (!paidUntil) {
    return 0;
  }

  const diffInMs = dateOnlyToUtcTime(paidUntil) - dateOnlyToUtcTime(today);
  const diffInDays = Math.floor(diffInMs / 86_400_000);

  return Math.max(0, diffInDays);
}

export function calculateNextPaidUntil(
  subscription: SubscriptionLike | null | undefined,
  today: string | Date = new Date(),
  daysToAdd = 30,
) {
  if (hasActiveAccess(subscription, today) && subscription?.paid_until) {
    return addDaysToDateOnly(subscription.paid_until, daysToAdd);
  }

  return addDaysToDateOnly(today, daysToAdd);
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
