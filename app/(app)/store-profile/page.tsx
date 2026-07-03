import { redirect } from "next/navigation";

import { StoreProfileForm } from "@/components/forms/store-profile-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function StoreProfilePage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, segment, city, whatsapp, business_logo_url")
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Perfil da Loja</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Personalize sua loja
        </h1>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Dados basicos</CardTitle>
        </CardHeader>
        <CardContent>
          <StoreProfileForm business={business} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
