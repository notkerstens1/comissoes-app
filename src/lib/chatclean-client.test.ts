import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChatCleanClient } from "./chatclean-client";

// A API ChatClean é externa multi-tenant: base path /v1/api/external/{apiId}/...
// auth via Bearer JWT. Respostas vêm em envelope { success, data[], count, hasMore }.
// opportunities exige ?pipelineStepId (uma etapa por vez).
// Ref: clientes/liv/sistema/chatclean-api.md (formas reais, testadas 2026-05-31)

describe("ChatCleanClient", () => {
  const config = {
    baseUrl: "https://betaapi.chatclean.com.br",
    apiId: "abc-123",
    token: "jwt-xyz",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lista oportunidades de uma etapa: URL com apiId + pipelineStepId, Bearer auth, extrai .data do envelope", async () => {
    const oportunidades = [{ id: 1, value: 5000, status: "open" }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: oportunidades, count: 1, hasMore: false }),
    });

    const client = new ChatCleanClient(config);
    const result = await client.listarOportunidadesPorEtapa(7);

    const [url, options] = (fetch as any).mock.calls[0];
    expect(url).toBe(
      "https://betaapi.chatclean.com.br/v1/api/external/abc-123/opportunities?pipelineStepId=7"
    );
    expect(options.headers.Authorization).toBe("Bearer jwt-xyz");
    expect(result).toEqual(oportunidades); // .data, não o envelope
  });

  it("lista pipeline-steps: URL correta e extrai .data", async () => {
    const steps = [{ id: 242, name: "LEAD", order: 1 }];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: steps }),
    });

    const client = new ChatCleanClient(config);
    const result = await client.listarPipelineSteps();

    const [url] = (fetch as any).mock.calls[0];
    expect(url).toBe("https://betaapi.chatclean.com.br/v1/api/external/abc-123/pipeline-steps");
    expect(result).toEqual(steps);
  });

  it("lança erro quando a API responde não-ok", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "ERR_SESSION_NOT_AUTH_TOKEN" }),
    });

    const client = new ChatCleanClient(config);
    await expect(client.listarOportunidadesPorEtapa(7)).rejects.toThrow("403");
  });

  it("buscarTodasOportunidades itera as etapas e achata, anotando a etapa em cada oportunidade", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 242, name: "LEAD" },
            { id: 250, name: "Reunião (SQL)" },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1 }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 2 }] }) });

    const client = new ChatCleanClient(config);
    const todas = await client.buscarTodasOportunidades();

    expect(todas).toHaveLength(2);
    expect(todas[0]).toMatchObject({ id: 1, etapa: "LEAD", pipelineStepId: 242 });
    expect(todas[1]).toMatchObject({ id: 2, etapa: "Reunião (SQL)", pipelineStepId: 250 });
  });

  it("buscarTodasOportunidades é resiliente: se UMA etapa dá erro (500), pula e retorna o resto", async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 242, name: "LEAD" },
            { id: 999, name: "follow quebrado" },
            { id: 250, name: "Reunião (SQL)" },
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 1 }] }) }) // 242 ok
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) }) // 999 falha
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 3 }] }) }); // 250 ok

    const client = new ChatCleanClient(config);
    const todas = await client.buscarTodasOportunidades();

    // não lança, e traz as 2 etapas que funcionaram (pula a 999)
    expect(todas).toHaveLength(2);
    expect(todas.map((o) => o.id).sort()).toEqual([1, 3]);
  });

  it("usa fallback de etapas quando pipeline-steps dá 500 (bug do servidor ChatClean)", async () => {
    let call = 0;
    (fetch as any).mockImplementation(async () => {
      call++;
      if (call === 1) return { ok: false, status: 500, json: async () => ({}) }; // pipeline-steps quebrado
      return { ok: true, json: async () => ({ data: [{ id: 1000 + call }] }) }; // opportunities ok
    });

    const client = new ChatCleanClient(config);
    const todas = await client.buscarTodasOportunidades();

    // pipeline-steps falhou mas o fallback manteve o sync vivo com oportunidades reais
    expect(todas.length).toBeGreaterThan(0);
    expect(todas[0].etapa).toBeTruthy();
  });
});
