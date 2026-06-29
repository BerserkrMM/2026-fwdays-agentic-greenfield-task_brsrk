import { describe, expect, it } from "vitest";
import { ParsingError } from "@/src/domain/parsing";
import { OpenAiParserAdapter } from "./adapters";

// @trace FR-PARSE-06, FR-PARSE-08
describe("OpenAiParserAdapter", () => {
  it("reports missing OpenAI configuration as an adapter failure", async () => {
    const previous = process.env.OPENAI_API_KEY;
    try {
      delete process.env.OPENAI_API_KEY;
      await expect(
        new OpenAiParserAdapter().parse({ kind: "text", content: "кава 45" }),
      ).rejects.toMatchObject({
        name: "ParsingError",
        code: "adapter-failed",
        message: "OpenAI API key is missing.",
      } satisfies Partial<ParsingError>);
    } finally {
      if (previous === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous;
    }
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

  it("converts an aborted (timed-out) request into an adapter failure", async () => {
    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        timeoutMs: 1,
        fetchImpl: (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser request timed out after 1ms");
  });

  it("converts a malformed response body into an adapter failure", async () => {
    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        fetchImpl: async () => new Response("not-json-at-all", { status: 200 }),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser returned a malformed response body");
  });

  it("converts a network-level fetch failure into an adapter failure", async () => {
    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        fetchImpl: async () => {
          throw new TypeError("network down");
        },
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser request failed");
  });

  it("times out when the response body stalls after headers arrive", async () => {
    await expect(
      new OpenAiParserAdapter({
        apiKey: "test-key",
        timeoutMs: 5,
        // Headers arrive (fetch resolves), but reading the body hangs until the
        // shared AbortController fires — verifies the timeout covers body parsing.
        fetchImpl: (_input, init) =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () =>
                  reject(new DOMException("Aborted", "AbortError")),
                );
              }),
          } as unknown as Response),
      }).parse({ kind: "text", content: "кава" }),
    ).rejects.toThrow("OpenAI parser request timed out after 5ms");
  });
});

// @trace FR-FILE-04, FR-PARSE-06
describe("OpenAiParserAdapter vision path", () => {
  const dataUri = "data:image/jpeg;base64,/9j/AAAQ";

  it("sends an image_url vision message for a photo payload and returns drafts", async () => {
    let sentBody: unknown;
    const adapter = new OpenAiParserAdapter({
      apiKey: "test-key",
      fetchImpl: async (_input, init) => {
        sentBody = JSON.parse(String(init?.body));
        return new Response(
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
                        sourceRef: { photoIndex: 0 },
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      },
    });

    const result = await adapter.parse({
      kind: "photo",
      content: "Розпізнай чек.",
      image: { dataUri, mimeType: "image/jpeg" },
    });

    expect(result.drafts).toHaveLength(1);
    const body = sentBody as { messages: Array<{ role: string; content: unknown }> };
    const userMessage = body.messages.find((message) => message.role === "user");
    const parts = userMessage?.content as Array<{ type: string; image_url?: { url: string } }>;
    expect(Array.isArray(parts)).toBe(true);
    const imagePart = parts.find((part) => part.type === "image_url");
    expect(imagePart?.image_url?.url).toBe(dataUri);
  });

  it("fails clearly when a photo payload carries no image", async () => {
    await expect(
      new OpenAiParserAdapter({ apiKey: "test-key" }).parse({ kind: "photo", content: "чек" }),
    ).rejects.toMatchObject({ name: "ParsingError", code: "adapter-failed" });
  });
});
