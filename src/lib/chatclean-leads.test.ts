import { describe, it, expect } from "vitest";
import { mapearOportunidadeParaLead, scoreOportunidade } from "./chatclean-leads";
import type { Opportunity } from "./chatclean-client";

describe("scoreOportunidade", () => {
  it("won = quente_a (fechou)", () => {
    const r = scoreOportunidade({ id: 1, status: "won", value: 20000 });
    expect(r.icpClasse).toBe("quente_a");
    expect(r.icpScore).toBeGreaterThanOrEqual(80);
  });

  it("open com proposta (value > 0) = morno pra cima", () => {
    const r = scoreOportunidade({ id: 1, status: "open", value: 18000 });
    expect(r.icpScore).toBeGreaterThanOrEqual(60);
    expect(["quente_b", "morno"]).toContain(r.icpClasse);
  });

  it("open sem valor = frio", () => {
    const r = scoreOportunidade({ id: 1, status: "open", value: 0 });
    expect(r.icpClasse).toBe("frio");
    expect(r.icpScore).toBeLessThan(40);
  });

  it("lost = frio independente de valor", () => {
    const r = scoreOportunidade({ id: 1, status: "lost", value: 50000 });
    expect(r.icpClasse).toBe("frio");
  });
});

describe("mapearOportunidadeParaLead", () => {
  it("mapeia campos do contato, valor, status e etapa", () => {
    const op: Opportunity = {
      id: 13390,
      value: 18000,
      status: "open",
      responsibleId: "445",
      pipelineStepId: 250,
      contact: { id: 9, name: "Marcone Chacon", number: "558486024581" },
      createdAt: "2026-05-31T10:00:00Z",
    };
    const lead = mapearOportunidadeParaLead(op, "Reunião (SQL)");

    expect(lead.chatcleanId).toBe("13390");
    expect(lead.nome).toBe("Marcone Chacon");
    expect(lead.telefone).toBe("558486024581");
    expect(lead.status).toBe("open");
    expect(lead.etapa).toBe("Reunião (SQL)");
    expect(lead.vendedor).toBe("445");
    expect(lead.valorProposta).toBe(18000);
    expect(lead.chatcleanCreatedAt).toBe("2026-05-31T10:00:00Z");
    expect(lead.icpScore).toBeGreaterThanOrEqual(60); // open com valor
  });

  it("usa 'Sem nome' quando o contato não tem nome", () => {
    const lead = mapearOportunidadeParaLead({ id: 7, status: "open" }, "LEAD");
    expect(lead.nome).toBe("Sem nome");
    expect(lead.telefone).toBeNull();
  });
});
