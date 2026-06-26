import { describe, it, expect } from "vitest";
import { getInitials } from "./utils";

describe("getInitials", () => {
  it("usa primeira e última palavra", () => {
    expect(getInitials("Marina Andrade")).toBe("MA");
  });
  it("nome único vira uma letra", () => {
    expect(getInitials("Erick")).toBe("E");
  });
  it("string vazia vira string vazia", () => {
    expect(getInitials("   ")).toBe("");
  });
});
