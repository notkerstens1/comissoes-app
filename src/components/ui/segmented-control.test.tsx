import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentedControl } from "./segmented-control";

describe("SegmentedControl", () => {
  it("dispara onChange ao clicar numa opção", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        value="semana"
        onChange={onChange}
        options={[{ value: "semana", label: "Semana" }, { value: "mes", label: "Mês" }]}
      />,
    );
    fireEvent.click(screen.getByText("Mês"));
    expect(onChange).toHaveBeenCalledWith("mes");
  });
});
