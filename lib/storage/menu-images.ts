export const MENU_IMAGES_BUCKET = "menu-images";
export const MAX_MENU_IMAGE_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export type MenuImageType = "products" | "combos";

const allowedMenuImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateMenuImageFile(file: File) {
  if (!allowedMenuImageTypes.includes(file.type as (typeof allowedMenuImageTypes)[number])) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_MENU_IMAGE_FILE_SIZE_BYTES) {
    throw new Error("A imagem deve ter no maximo 2 MB.");
  }
}

export function getMenuImagePath({
  itemType,
  businessId,
  itemId,
  file,
}: {
  itemType: MenuImageType;
  businessId: string;
  itemId: string;
  file: File;
}) {
  validateMenuImageFile(file);

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return `${itemType}/${businessId}/${itemId}/image.${extensionByType[file.type]}`;
}
