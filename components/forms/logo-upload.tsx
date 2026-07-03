"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  BUSINESS_LOGOS_BUCKET,
  getBusinessLogoPath,
  getInitials,
  MAX_LOGO_FILE_SIZE_BYTES,
  validateLogoFile,
} from "@/lib/storage/business-logos";

type LogoUploadProps = {
  businessId: string;
  businessName: string;
  initialLogoUrl: string | null;
  onUploaded: (publicUrl: string) => void;
};

export function LogoUpload({
  businessId,
  businessName,
  initialLogoUrl,
  onUploaded,
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      validateLogoFile(file);
      const supabase = createClient();
      const path = getBusinessLogoPath(businessId, file);
      const { error: uploadError } = await supabase.storage
        .from(BUSINESS_LOGOS_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUSINESS_LOGOS_BUCKET).getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("businesses")
        .update({ business_logo_url: publicUrl })
        .eq("id", businessId);

      if (updateError) {
        throw updateError;
      }

      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Nao foi possivel enviar a logo.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Logo de ${businessName}`}
            className="size-20 rounded-lg border object-cover"
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-lg border bg-muted text-xl font-semibold">
            {getInitials(businessName)}
          </div>
        )}
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageUp />
            {isUploading ? "Enviando..." : "Enviar logo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WEBP ate {MAX_LOGO_FILE_SIZE_BYTES / 1024 / 1024} MB.
          </p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
