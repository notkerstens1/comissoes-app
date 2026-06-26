import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "./reveal";

describe("Reveal", () => {
  it("renderiza os filhos", () => {
    render(<Reveal><span>conteúdo</span></Reveal>);
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
