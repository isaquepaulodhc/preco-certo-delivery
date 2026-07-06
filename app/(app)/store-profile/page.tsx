import { redirect } from "next/navigation";

import { StoreProfileForm } from "@/components/forms/store-profile-form";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function StoreProfilePage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, segment, city, state_uf, whatsapp, business_logo_url")
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold text-[#F97316]">Perfil do negócio</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F172A]">
          Personalize sua loja
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          Mantenha nome, segmento, cidade, UF e WhatsApp alinhados com a operação.
        </p>
      </div>

      <StoreProfileForm business={business} />
    </AppShell>
  );
}
