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
  BRAZILIAN_STATE_UFS,
  storeProfileSchema,
  type StoreProfileInput,
} from "@/lib/validations/store-profile";

type StoreProfileFormProps = {
  business: {
    id: string;
    name: string;
    segment: string | null;
    city: string | null;
    state_uf: string | null;
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
      stateUf: normalizeStateUf(business.state_uf),
      whatsapp: business.whatsapp ?? "",
    },
  });
  const watchedName = useWatch({ control: form.control, name: "name" });
  const watchedSegment = useWatch({ control: form.control, name: "segment" });
  const watchedCity = useWatch({ control: form.control, name: "city" });
  const watchedStateUf = useWatch({ control: form.control, name: "stateUf" });

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
        state_uf: values.stateUf || null,
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
    <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
      <div className="rounded-[22px] border border-[#FED7AA]/70 bg-[#FFF7ED]/45 p-6 text-center">
        <LogoUpload
          businessId={business.id}
          businessName={watchedName || business.name}
          initialLogoUrl={logoUrl}
          onUploaded={setLogoUrl}
          variant="hero"
        />
        <h2 className="mt-5 text-2xl font-extrabold text-[#0F172A]">
          {watchedName || "Nome do delivery"}
        </h2>
        <p className="mt-2 text-sm font-medium text-[#64748B]">
          {formatBusinessSubtitle(watchedSegment, watchedCity, watchedStateUf)}
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
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

          <div className="space-y-2">
            <Label htmlFor="stateUf">UF</Label>
            <select
              id="stateUf"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              {...form.register("stateUf")}
            >
              <option value="">Selecione</option>
              {BRAZILIAN_STATE_UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {form.formState.errors.stateUf ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.stateUf.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" {...form.register("whatsapp")} />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 rounded-xl bg-[#F97316] px-5 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-[#EA580C]"
        >
          {isSubmitting ? "Salvando..." : "Salvar perfil"}
        </Button>
      </form>
    </div>
  );
}

function formatBusinessSubtitle(
  segment?: string,
  city?: string,
  stateUf?: string,
) {
  const location = [city, stateUf].filter(Boolean).join(" / ");
  const parts = [segment, location].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "Segmento, cidade e UF";
}

function normalizeStateUf(value: string | null): StoreProfileInput["stateUf"] {
  if (value && (BRAZILIAN_STATE_UFS as readonly string[]).includes(value)) {
    return value as StoreProfileInput["stateUf"];
  }

  return "";
}
