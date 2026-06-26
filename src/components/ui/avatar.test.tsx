import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("mostra iniciais quando não há rank", () => {
    render(<Avatar name="Marina Andrade" />);
    expect(screen.getByText("MA")).toBeInTheDocument();
  });
  it("expõe label acessível com o nome", () => {
    render(<Avatar name="Rafael Costa" rank={1} />);
    expect(screen.getByLabelText("Rafael Costa")).toBeInTheDocument();
  });
});
