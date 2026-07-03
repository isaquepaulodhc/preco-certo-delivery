export type SubscriptionStatus =
  | "trial"
  | "active"
  | "expired"
  | "blocked"
  | "cancelled";

export type SubscriptionLike = {
  status: SubscriptionStatus;
  paid_until: string | Date | null;
};

export type Business = {
  id: string;
  owner_user_id: string;
  name: string;
  segment: string | null;
  city: string | null;
  whatsapp: string | null;
  business_logo_url: string | null;
  average_monthly_revenue: number;
  target_monthly_revenue: number;
  desired_profit_margin: number;
};
