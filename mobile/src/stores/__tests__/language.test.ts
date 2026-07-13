import { resolveLanguage } from "../language";

describe("resolveLanguage", () => {
  it("returns explicit preference regardless of device language", () => {
    expect(resolveLanguage("id", "en")).toBe("id");
    expect(resolveLanguage("en", "id")).toBe("en");
  });

  it("resolves system preference from a supported device language", () => {
    expect(resolveLanguage("system", "id")).toBe("id");
    expect(resolveLanguage("system", "en")).toBe("en");
  });

  it("falls back to English for unsupported (non-Indonesian) device languages", () => {
    expect(resolveLanguage("system", "ja")).toBe("en");
    expect(resolveLanguage("system", "de")).toBe("en");
  });

  it("falls back to English when device language is missing", () => {
    expect(resolveLanguage("system", null)).toBe("en");
    expect(resolveLanguage("system", undefined)).toBe("en");
  });
});
