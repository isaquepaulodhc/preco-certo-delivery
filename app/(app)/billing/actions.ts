"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertBillingPlan } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

export async function requestManualPixPayment(formData: FormData) {
  const planCode = String(formData.get("planCode") ?? "");
  assertBillingPlan(planCode);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_manual_pix_payment_request", {
    p_plan_code: planCode,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/billing");
  redirect("/billing");
}
