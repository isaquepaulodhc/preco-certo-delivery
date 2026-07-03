export const BUSINESS_LOGOS_BUCKET = "business-logos";
export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const allowedLogoTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateLogoFile(file: File) {
  if (!allowedLogoTypes.includes(file.type as (typeof allowedLogoTypes)[number])) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    throw new Error("A logo deve ter no maximo 2 MB.");
  }
}

export function getBusinessLogoPath(businessId: string, file: File) {
  validateLogoFile(file);

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return `${businessId}/logo.${extensionByType[file.type]}`;
}

export function getInitials(name: string | null | undefined) {
  const parts = (name || "Preco Certo")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "PC";
}
