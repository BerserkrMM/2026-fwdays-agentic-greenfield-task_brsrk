import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryRepositories } from "@/src/db/memory";
import type { ParserAdapter } from "@/src/domain/parsing";
import type { Repositories } from "@/src/domain/ports";
import { ParsingService } from "./service";

let repos: Repositories;

beforeEach(() => {
  repos = createInMemoryRepositories();
});

async function createTextEvent(rawText = "buyer@example.com кава 45 грн") {
  return repos.inputEvents.create({
    source: "text",
    provider: null,
    rawText,
    storageUri: null,
    mimeType: null,
  });
}

function recordParserRuns() {
  const createdRuns: Array<{ status: string; error: string | null }> = [];
  const originalCreate = repos.parserRuns.create.bind(repos.parserRuns);
  repos.parserRuns.create = async (run) => {
    const created = await originalCreate(run);
    createdRuns.push({ status: created.status, error: created.error });
    return created;
  };
  return createdRuns;
}

// @trace FR-PARSE-01, FR-PARSE-02, FR-PARSE-03, FR-PARSE-04, FR-PARSE-05, FR-PARSE-06, FR-PARSE-07, FR-PARSE-08
describe("ParsingService.parse", () => {
  it("normalizes before adapter call, returns drafts only, and records a successful parser_run", async () => {
    const event = await createTextEvent();
    const seenPayloads: unknown[] = [];
    const adapter: ParserAdapter = {
      async parse(payload) {
        seenPayloads.push(payload);
        return {
          drafts: [
            {
              description: " Кава ",
              amountMinor: -4500,
              currency: "UAH",
              type: "expense",
              category: "Кафе",
              confidence: 0.88,
            },
          ],
        };
      },
    };

    const result = await new ParsingService(repos, adapter).parse({
      inputEventId: event.id,
      payload: { kind: "text", content: event.rawText ?? "" },
    });

    expect(seenPayloads).toEqual([
      { kind: "text", content: "[email] кава 45 грн" },
    ]);
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      description: "Кава",
      amountMinor: -4500,
      category: "Кафе",
      confidence: 0.88,
    });
    expect(result.parserRun.status).toBe("success");
    expect(result.parserRun.inputEventId).toBe(event.id);
    expect(result.parserRun.normalizedPayload).toBe(
      JSON.stringify({ kind: "text", content: "[email] кава 45 грн" }),
    );
    expect(JSON.parse(result.parserRun.resultJson ?? "{}")).toEqual({
      drafts: result.drafts,
    });
    expect(await repos.ledgerItems.listAll()).toEqual([]);
  });

  it("records adapter failures and allows retry as a new parser_run", async () => {
    const event = await createTextEvent("таксі 120 грн");
    let attempts = 0;
    const adapter: ParserAdapter = {
      async parse() {
        attempts += 1;
        if (attempts === 1) throw new Error("OpenAI API key is missing");
        return {
          drafts: [
            {
              description: "Таксі",
              amountMinor: -12000,
              currency: "UAH",
              type: "expense",
              category: "Транспорт",
            },
          ],
        };
      },
    };
    const createdRuns = recordParserRuns();
    const service = new ParsingService(repos, adapter);

    await expect(
      service.parse({ inputEventId: event.id, payload: { kind: "text", content: "таксі 120 грн" } }),
    ).rejects.toThrow("OpenAI API key is missing");

    const second = await service.parse({
      inputEventId: event.id,
      payload: { kind: "text", content: "таксі 120 грн" },
    });

    expect(createdRuns).toEqual([
      { status: "failed", error: "OpenAI API key is missing" },
      { status: "success", error: null },
    ]);
    expect(second.parserRun.status).toBe("success");
    expect(second.drafts[0]?.description).toBe("Таксі");
  });

  it("records invalid adapter draft output as a failed parser_run", async () => {
    const event = await createTextEvent("дохід 100 грн");
    const createdRuns = recordParserRuns();
    const adapter: ParserAdapter = {
      async parse() {
        return {
          drafts: [
            {
              description: "Дохід",
              amountMinor: -10000,
              currency: "UAH",
              type: "income",
              category: "Дохід",
            },
          ],
        };
      },
    };

    await expect(
      new ParsingService(repos, adapter).parse({
        inputEventId: event.id,
        payload: { kind: "text", content: "дохід 100 грн" },
      }),
    ).rejects.toThrow("amountMinor sign must match type");

    expect(createdRuns).toEqual([
      {
        status: "failed",
        error: "Invalid parser draft 1: amountMinor sign must match type.",
      },
    ]);
    expect(await repos.ledgerItems.listAll()).toEqual([]);
  });

  it("records non-Error adapter failures as explicit failed parser_runs", async () => {
    const event = await createTextEvent("кава");
    const adapter: ParserAdapter = {
      async parse() {
        throw "provider unavailable";
      },
    };

    await expect(
      new ParsingService(repos, adapter).parse({
        inputEventId: event.id,
        payload: { kind: "text", content: "кава" },
      }),
    ).rejects.toThrow("provider unavailable");
  });

  it("rejects unknown input events before adapter invocation", async () => {
    let called = false;
    const adapter: ParserAdapter = {
      async parse() {
        called = true;
        return { drafts: [] };
      },
    };

    await expect(
      new ParsingService(repos, adapter).parse({
        inputEventId: "00000000-0000-0000-0000-000000000000",
        payload: { kind: "text", content: "кава" },
      }),
    ).rejects.toThrow("input-event-not-found");
    expect(called).toBe(false);
  });
});
