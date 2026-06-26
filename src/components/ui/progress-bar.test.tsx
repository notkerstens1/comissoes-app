import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("expõe aria-valuenow clampado em 100", () => {
    render(<ProgressBar value={150} max={100} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
  it("mostra label percentual quando showLabel", () => {
    render(<ProgressBar value={60} max={120} showLabel />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
