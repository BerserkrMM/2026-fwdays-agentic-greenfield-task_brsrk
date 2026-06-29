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

  constructor(private readonly options: OpenAiParserAdapterOptions = {}) {
    this.model = options.model ?? "gpt-4o-mini";
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/chat/completions";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async parse(payload: ParserPayload): Promise<AdapterParsingResult> {
    const apiKey = this.options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ParsingError("adapter-failed", "OpenAI API key is missing.");
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
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

    if (!response.ok) {
      throw new ParsingError("adapter-failed", `OpenAI parser failed: ${response.status}`);
    }

    const data = (await response.json()) as OpenAiChatResponse;
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
