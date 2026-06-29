import { describe, expect, it } from "vitest";
import { ParsingError } from "@/src/domain/parsing";
import { OpenAiParserAdapter } from "./adapters";

// @trace FR-PARSE-06, FR-PARSE-08
describe("OpenAiParserAdapter", () => {
  it("reports missing OpenAI configuration as an adapter failure", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(
      new OpenAiParserAdapter().parse({ kind: "text", content: "кава 45" }),
    ).rejects.toMatchObject({
      name: "ParsingError",
      code: "adapter-failed",
      message: "OpenAI API key is missing.",
    } satisfies Partial<ParsingError>);
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  });

  it("parses JSON drafts from an OpenAI-compatible response", async () => {
    const adapter = new OpenAiParserAdapter({
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    drafts: [
                      {
                        description: "Кава",
                        amountMinor: -4500,
                        currency: "UAH",
                        type: "expense",
                        category: "Кафе",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    });

    await expect(adapter.parse({ kind: "text", content: "кава 45" })).resolves.toEqual({
      drafts: [
        {
          description: "Кава",
          amountMinor: -4500,
          currency: "UAH",
          type: "expense",
          category: "Кафе",
        },
      ],
    });
  });

  it("turns provider errors and invalid response content into adapter failures", async () => {
    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        fetchImpl: async () => new Response("{}", { status: 500 }),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser failed: 500");

    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        fetchImpl: async () =>
          new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), {
            status: 200,
          }),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser returned invalid JSON");

    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        fetchImpl: async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser returned no content");
  });

  it("rejects parseable JSON content without a drafts array", async () => {
    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        fetchImpl: async () =>
          new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
            status: 200,
          }),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser returned no drafts array");
  });
});
