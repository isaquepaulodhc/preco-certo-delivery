import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/forms/onboarding-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .maybeSingle();

  if (business) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      <Card className="w-full max-w-2xl rounded-lg">
        <CardHeader>
          <CardTitle>Configure seu delivery</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esses dados criam seu negocio e liberam o trial de 7 dias.
          </p>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
