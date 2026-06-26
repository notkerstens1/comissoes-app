import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const css = readFileSync(path.resolve(__dirname, "globals.css"), "utf8");

describe("design tokens", () => {
  it.each([
    "--liv-info", "--liv-teal", "--liv-violet", "--liv-orange",
    "--ease-out", "--ease-emphasized",
    "--dur-fast", "--dur-base", "--dur-slow",
    "--glow-gold", "--glow-sage",
  ])("define %s", (token) => {
    expect(css).toContain(token);
  });
});
