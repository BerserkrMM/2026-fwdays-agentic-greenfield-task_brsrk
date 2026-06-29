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

const OPENAI_SYSTEM_PROMPT = `You are a financial text parser for a Ukrainian personal finance app.

Return ONLY valid JSON. No markdown, no comments, no explanation.

Required output shape:
{
  "drafts": [
    {
      "description": "string",
      "amountMinor": 0,
      "currency": "UAH",
      "type": "expense",
      "occurredAt": "optional ISO-8601 string",
      "category": "Без категорії",
      "confidence": 0.0
    }
  ]
}

Task:
Parse the user's Ukrainian free-form finance text into atomic ledger item drafts.

Rules:
1. Extract every separate financial operation mentioned in the text.
   Example: "40 грн ковбаса, 20 грн хліб" => two drafts.

2. Use these exact field names:
   - description
   - amountMinor
   - currency
   - type
   - occurredAt
   - category
   - confidence

3. Do NOT use any other field names such as item, name, amount, price, date, kind.

4. currency is always "UAH".

5. amountMinor is signed kopiyky:
   - 300 грн => 30000
   - 300.50 грн => 30050
   - expense => negative amountMinor
   - income => positive amountMinor

6. Determine type from the meaning of the user text:
   Income examples:
   - "отримав зарплату"
   - "зарплата"
   - "переказали"
   - "продаж айфона"
   - "повернули борг"
   - "дохід"
   - "фріланс оплата"
   These should be type "income" and amountMinor positive.

   Expense examples:
   - "купив"
   - "заплатив"
   - "витратив"
   - "кава"
   - "хліб"
   - "таксі"
   - "оренда"
   - "комуналка"
   These should be type "expense" and amountMinor negative.

7. If the text is ambiguous, choose the most likely financial meaning.
   For everyday purchases, default to expense.
   For salary, selling, receiving money, refunds, or debt returned to the user, use income.

8. If a required value cannot be confidently extracted:
   - description: use the most relevant short phrase from the text; if impossible, use "Невідомо"
   - amountMinor: use 0
   - type: use "expense" unless the text clearly indicates income
   - category: use "Без категорії"
   - confidence: use a low value such as 0.2

9. If an amount is missing but the text still describes a finance operation, create a draft with amountMinor 0.

10. If the text contains no financial operation at all, return:
{
  "drafts": []
}

11. Category:
   Use a short Ukrainian category if obvious, for example:
   - food, groceries, cafe => "Їжа"
   - taxi, fuel, transport => "Транспорт"
   - salary, freelance, sale => "Дохід"
   - rent, utilities => "Житло"
   - medicine, doctor => "Здоровʼя"
   Otherwise use "Без категорії".

12. Dates:
   If the user mentions a date, return occurredAt as ISO-8601.
   If no date is mentioned, omit occurredAt.
   Do not invent dates.

13. Multiple amounts:
   Split into separate drafts when amounts clearly belong to separate items.
   Example: "40 грн ковбаса, 20 грн хліб" => two drafts.
   If one total amount belongs to several words but cannot be split, create one draft with combined description.

14. Discounts, cashback, refunds:
   - cashback received by the user => income
   - refund received by the user => income
   - discount itself is not a separate operation unless an actual paid amount is present

15. Transfers:
   If text clearly describes moving money between own accounts, represent it as drafts only if there is a clear income/expense direction. Otherwise use one expense draft with category "Переказ" and low confidence.

16. Output must pass this TypeScript contract:
type ParsedLedgerItemDraft = {
  description: string
  amountMinor: number
  currency: "UAH"
  type: "expense" | "income"
  occurredAt?: string
  category: string
  confidence?: number
}

Important:
- Always return JSON with top-level "drafts" array.
- Never return prose.
- Never return null.
- Never return unrecognized fields.
- Never use amount in hryvnias; always use signed kopiyky.`;

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

    // `fetch` resolves once headers arrive, but the body is streamed afterwards,
    // so the same AbortController must stay armed through `response.json()` — a
    // stalled body would otherwise hang `parse()` indefinitely. Clear the timer
    // only once parsing has fully completed.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
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
              content: OPENAI_SYSTEM_PROMPT,
            },
            { role: "user", content: JSON.stringify(payload) },
          ],
        }),
      });

      if (!response.ok) {
        throw new ParsingError("adapter-failed", `OpenAI parser failed: ${response.status}`);
      }

      let data: OpenAiChatResponse;
      try {
        data = (await response.json()) as OpenAiChatResponse;
      } catch {
        if (controller.signal.aborted) {
          throw new ParsingError(
            "adapter-failed",
            `OpenAI parser request timed out after ${this.timeoutMs}ms.`,
          );
        }
        throw new ParsingError(
          "adapter-failed",
          "OpenAI parser returned a malformed response body.",
        );
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
    } catch (error) {
      if (error instanceof ParsingError) throw error;
      const reason = controller.signal.aborted
        ? `request timed out after ${this.timeoutMs}ms`
        : "request failed";
      throw new ParsingError("adapter-failed", `OpenAI parser ${reason}.`);
    } finally {
      clearTimeout(timer);
    }
  }
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}
