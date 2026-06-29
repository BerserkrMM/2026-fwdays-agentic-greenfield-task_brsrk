import type {
  AdapterParsingResult,
  ParserAdapter,
  ParserPayload,
} from "@/src/domain/parsing";
import { ParsingError } from "@/src/domain/parsing";

export interface OpenAiParserAdapterOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * OpenAI-compatible adapter boundary (FR-PARSE-06). It is intentionally small and
 * injectable so CI and import-channel tests can use deterministic adapters while
 * production code can provide OpenAI configuration later via Settings/process env.
 */
export class OpenAiParserAdapter implements ParserAdapter {
  private readonly model: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: OpenAiParserAdapterOptions = {}) {
    this.model = options.model ?? "gpt-4o-mini";
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/chat/completions";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async parse(payload: ParserPayload): Promise<AdapterParsingResult> {
    const apiKey = this.options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ParsingError("adapter-failed", "OpenAI API key is missing.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Return JSON with a drafts array of UAH ledger item drafts. Expenses are negative, income is positive.",
            },
            { role: "user", content: JSON.stringify(payload) },
          ],
        }),
      });
    } catch {
      const reason =
        controller.signal.aborted ? `request timed out after ${this.timeoutMs}ms` : "request failed";
      throw new ParsingError("adapter-failed", `OpenAI parser ${reason}.`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new ParsingError("adapter-failed", `OpenAI parser failed: ${response.status}`);
    }

    let data: OpenAiChatResponse;
    try {
      data = (await response.json()) as OpenAiChatResponse;
    } catch {
      throw new ParsingError("adapter-failed", "OpenAI parser returned a malformed response body.");
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new ParsingError("adapter-failed", "OpenAI parser returned no content.");

    let parsed: AdapterParsingResult;
    try {
      parsed = JSON.parse(content) as AdapterParsingResult;
    } catch {
      throw new ParsingError("adapter-failed", "OpenAI parser returned invalid JSON.");
    }
    if (!Array.isArray(parsed.drafts)) {
      throw new ParsingError("adapter-failed", "OpenAI parser returned no drafts array.");
    }
    return { drafts: parsed.drafts };
  }
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
