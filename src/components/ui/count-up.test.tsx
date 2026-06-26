import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountUp } from "./count-up";

describe("CountUp", () => {
  it("renderiza o valor final formatado em pt-BR com prefixo", () => {
    render(<CountUp value={120000} prefix="R$ " />);
    expect(screen.getByText("R$ 120.000")).toBeInTheDocument();
  });
  it("respeita decimais e sufixo", () => {
    render(<CountUp value={1.85} decimals={2} suffix="x" />);
    expect(screen.getByText("1,85x")).toBeInTheDocument();
  });
});
