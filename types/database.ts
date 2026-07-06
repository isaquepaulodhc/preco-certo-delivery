export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          segment: string | null;
          city: string | null;
          state_uf: string | null;
          whatsapp: string | null;
          business_logo_url: string | null;
          average_monthly_revenue: number;
          target_monthly_revenue: number;
          desired_profit_margin: number;
          ifood_plan: "basic" | "delivery" | "custom";
          ifood_commission_percentage: number;
          ifood_payment_fee_percentage: number;
          ifood_receivables_advance_percentage: number;
          ifood_monthly_fee: number;
          ifood_paid_online_by_default: boolean;
          card_fee_percentage: number;
          average_coupon_percentage: number;
          free_delivery_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          segment?: string | null;
          city?: string | null;
          state_uf?: string | null;
          whatsapp?: string | null;
          business_logo_url?: string | null;
          average_monthly_revenue?: number;
          target_monthly_revenue?: number;
          desired_profit_margin?: number;
          ifood_plan?: "basic" | "delivery" | "custom";
          ifood_commission_percentage?: number;
          ifood_payment_fee_percentage?: number;
          ifood_receivables_advance_percentage?: number;
          ifood_monthly_fee?: number;
          ifood_paid_online_by_default?: boolean;
          card_fee_percentage?: number;
          average_coupon_percentage?: number;
          free_delivery_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan: string;
          status: "trial" | "active" | "expired" | "blocked" | "cancelled";
          payment_method:
            | "manual_pix"
            | "credit_card"
            | "mercado_pago"
            | "stripe"
            | "other";
          amount: number;
          started_at: string | null;
          paid_until: string | null;
          last_payment_at: string | null;
          external_provider: string | null;
          external_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & {
          business_id: string;
          plan: string;
          status: "trial" | "active" | "expired" | "blocked" | "cancelled";
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_business_with_trial: {
        Args: {
          p_name: string;
          p_segment?: string | null;
          p_city?: string | null;
          p_whatsapp?: string | null;
          p_average_monthly_revenue?: number;
          p_target_monthly_revenue?: number;
          p_desired_profit_margin?: number;
        };
        Returns: Json;
      };
      current_business_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
