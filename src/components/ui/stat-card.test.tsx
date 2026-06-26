import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renderiza label, valor e meta", () => {
    render(<StatCard label="Faturamento" value="R$ 325.000" meta="Meta 20–25%" />);
    expect(screen.getByText("Faturamento")).toBeInTheDocument();
    expect(screen.getByText("R$ 325.000")).toBeInTheDocument();
    expect(screen.getByText("Meta 20–25%")).toBeInTheDocument();
  });
});
