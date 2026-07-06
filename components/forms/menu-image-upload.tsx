"use client";

import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/storage/business-logos";
import {
  getMenuImagePath,
  MAX_MENU_IMAGE_FILE_SIZE_BYTES,
  MENU_IMAGES_BUCKET,
  type MenuImageType,
  validateMenuImageFile,
} from "@/lib/storage/menu-images";
import { createClient } from "@/lib/supabase/client";

type MenuImageUploadProps = {
  businessId: string;
  itemId: string;
  itemType: MenuImageType;
  itemName: string;
  initialImageUrl: string | null;
  onUploaded: (publicUrl: string) => void;
};

export function MenuImageUpload({
  businessId,
  itemId,
  itemType,
  itemName,
  initialImageUrl,
  onUploaded,
}: MenuImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialImageUrl);
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
      validateMenuImageFile(file);
      const supabase = createClient();
      const path = getMenuImagePath({
        itemType,
        businessId,
        itemId,
        file,
      });
      const { error: uploadError } = await supabase.storage
        .from(MENU_IMAGES_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);

      const { error: updateError } = await supabase
        .from(itemType)
        .update({ image_url: publicUrl })
        .eq("id", itemId)
        .eq("business_id", businessId);

      if (updateError) {
        throw updateError;
      }

      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Nao foi possivel enviar a imagem.",
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
      <div className="flex items-center gap-3">
        <MenuImagePreview imageUrl={previewUrl} name={itemName} />
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
            {isUploading ? "Enviando..." : "Imagem"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WEBP até {MAX_MENU_IMAGE_FILE_SIZE_BYTES / 1024 / 1024} MB.
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

function MenuImagePreview({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#FFF7ED] text-lg font-extrabold text-[#F97316]">
      <span aria-hidden="true">{getInitials(name)}</span>
      {imageUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`Imagem de ${name}`}
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </span>
  );
}
