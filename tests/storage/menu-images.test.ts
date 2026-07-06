import { describe, expect, it } from "vitest";

import {
  getMenuImagePath,
  validateMenuImageFile,
} from "@/lib/storage/menu-images";

function makeFile(type: string, size = 1024) {
  return new File([new Uint8Array(size)], "image", { type });
}

describe("menu images", () => {
  it("usa tipo, business_id e item_id no path", () => {
    const file = makeFile("image/png");

    expect(
      getMenuImagePath({
        itemType: "products",
        businessId: "business-123",
        itemId: "product-456",
        file,
      }),
    ).toBe("products/business-123/product-456/image.png");
  });

  it("aceita JPG, PNG e WEBP", () => {
    expect(() => validateMenuImageFile(makeFile("image/jpeg"))).not.toThrow();
    expect(() => validateMenuImageFile(makeFile("image/png"))).not.toThrow();
    expect(() => validateMenuImageFile(makeFile("image/webp"))).not.toThrow();
  });

  it("rejeita tipo invalido", () => {
    expect(() => validateMenuImageFile(makeFile("image/gif"))).toThrow(
      "Envie uma imagem JPG, PNG ou WEBP.",
    );
  });
});
