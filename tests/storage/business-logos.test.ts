import { describe, expect, it } from "vitest";

import {
  getBusinessLogoPath,
  validateLogoFile,
} from "@/lib/storage/business-logos";

function makeFile(type: string, size = 1024) {
  return new File([new Uint8Array(size)], "logo", { type });
}

describe("business logos", () => {
  it("usa o business_id como primeiro segmento do path", () => {
    const file = makeFile("image/png");
    expect(getBusinessLogoPath("business-123", file)).toBe("business-123/logo.png");
  });

  it("aceita JPG, PNG e WEBP", () => {
    expect(() => validateLogoFile(makeFile("image/jpeg"))).not.toThrow();
    expect(() => validateLogoFile(makeFile("image/png"))).not.toThrow();
    expect(() => validateLogoFile(makeFile("image/webp"))).not.toThrow();
  });

  it("rejeita tipo invalido", () => {
    expect(() => validateLogoFile(makeFile("image/gif"))).toThrow(
      "Envie uma imagem JPG, PNG ou WEBP.",
    );
  });
});
