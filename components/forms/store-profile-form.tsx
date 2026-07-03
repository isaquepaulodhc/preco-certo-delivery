"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LogoUpload } from "@/components/forms/logo-upload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  storeProfileSchema,
  type StoreProfileInput,
} from "@/lib/validations/store-profile";

type StoreProfileFormProps = {
  business: {
    id: string;
    name: string;
    segment: string | null;
    city: string | null;
    whatsapp: string | null;
    business_logo_url: string | null;
  };
};

export function StoreProfileForm({ business }: StoreProfileFormProps) {
  const [logoUrl, setLogoUrl] = useState(business.business_logo_url);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<StoreProfileInput>({
    resolver: zodResolver(storeProfileSchema),
    defaultValues: {
      name: business.name,
      segment: business.segment ?? "",
      city: business.city ?? "",
      whatsapp: business.whatsapp ?? "",
    },
  });
  const watchedName = useWatch({ control: form.control, name: "name" });

  async function onSubmit(values: StoreProfileInput) {
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: values.name,
        segment: values.segment || null,
        city: values.city || null,
        whatsapp: values.whatsapp || null,
      })
      .eq("id", business.id);

    setIsSubmitting(false);

    if (updateError) {
      setError("Nao foi possivel salvar o perfil da loja.");
      return;
    }

    setMessage("Perfil da loja salvo.");
  }

  return (
    <div className="space-y-6">
      <LogoUpload
        businessId={business.id}
        businessName={watchedName}
        initialLogoUrl={logoUrl}
        onUploaded={setLogoUrl}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {message ? (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome do delivery</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment">Segmento</Label>
            <Input id="segment" {...form.register("segment")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" {...form.register("city")} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" {...form.register("whatsapp")} />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar perfil"}
        </Button>
      </form>
    </div>
  );
}
