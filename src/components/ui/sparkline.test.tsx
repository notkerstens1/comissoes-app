import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "./sparkline";

describe("Sparkline", () => {
  it("não renderiza com menos de 2 pontos", () => {
    const { container } = render(<Sparkline data={[1]} />);
    expect(container.querySelector("svg")).toBeNull();
  });
  it("renderiza um path de linha com dados válidos", () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5]} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
});
