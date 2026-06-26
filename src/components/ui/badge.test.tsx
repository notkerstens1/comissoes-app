import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("aplica a variante gold", () => {
    render(<Badge variant="gold">Meta batida</Badge>);
    const el = screen.getByText("Meta batida");
    expect(el.className).toMatch(/liv-gold/);
  });
});
