"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function approvePaymentRequest(formData: FormData) {
  const paymentRequestId = String(formData.get("paymentRequestId") ?? "");

  if (!paymentRequestId) {
    throw new Error("Solicitacao de pagamento obrigatoria.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_payment_request", {
    p_payment_request_id: paymentRequestId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/payments");
  redirect("/admin/payments");
}

export async function cancelPaymentRequest(formData: FormData) {
  const paymentRequestId = String(formData.get("paymentRequestId") ?? "");

  if (!paymentRequestId) {
    throw new Error("Solicitacao de pagamento obrigatoria.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_payment_request", {
    p_payment_request_id: paymentRequestId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/payments");
  redirect("/admin/payments");
}
