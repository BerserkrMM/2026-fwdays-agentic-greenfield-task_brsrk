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
      "confidence": 0.0,
      "sourceRef": { "rowNumber": 2 }
    }
  ]
}

Task:
Parse the user's Ukrainian free-form finance text or normalized bank-statement rows into atomic ledger item drafts.

For bank-statement payloads, the user content is JSON with table structure, for example {"provider":"monobank","headerRowNumber":1,"headers":[...],"rows":[{"rowNumber":2,"rowId":"r2","cells":[...]}]}. Headers and cells may use any bank-specific wording. Infer which cells mean operation date, description/merchant, amount, currency, balance, commission, etc. Return at most one draft per source row and include sourceRef.rowNumber from that row on the corresponding draft. Do not skip a row just because column names are unfamiliar: use the row's headers+cells to decide.

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
   - sourceRef (only when the input row provides a source row number)

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
   Always try to assign a useful short Ukrainian category. Do not overuse "Без категорії".
   For bank-statement rows, use every clue available: merchant/description, MCC, provider, existing category columns, and common merchant names.
   Examples:
   - food, groceries, supermarket, АТБ, Сільпо, Novus, Fora, Varus, McDonald's, cafe => "Їжа"
   - taxi, Uklon, Bolt, Uber, fuel, WOG, OKKO, transport => "Транспорт"
   - Epicentr / Епіцентр, household/building supplies => "Дім"
   - mobile/internet/telecom, Kyivstar, Vodafone, Lifecell, PRTMN *INTERNET => "Звʼязок"
   - salary, freelance, sale, cashback/refund received => "Дохід"
   - bank interest/fees/commission/card service/write-off interest => "Банківські послуги"
   - rent, utilities => "Житло"
   - medicine, doctor, pharmacy => "Здоровʼя"
   If no useful category can be inferred after considering these clues, use "Без категорії".

12. Dates:
   If the user text or bank row contains an operation date/time, return occurredAt as ISO-8601.
   For bank-statement rows, treat the row's operation date cell as the source of occurredAt even if the header wording is unfamiliar.
   If no date is present anywhere in that row/text, omit occurredAt. Do not invent dates.

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
  sourceRef?: { rowNumber?: number; photoIndex?: number }
}

Important:
- Always return JSON with top-level "drafts" array.
- Never return prose.
- Never return null.
- Never return unrecognized fields.
- Never use amount in hryvnias; always use signed kopiyky.
- For bank-statement rows, amountMinor and description are mandatory. If a row has no transaction amount or no meaningful description/merchant/counterparty, do not create a draft for that row.
- For bank-statement rows, always echo sourceRef.rowNumber exactly from the input row.`;

const OPENAI_VISION_SYSTEM_PROMPT = `You are a receipt parser for a Ukrainian personal finance app. You receive ONE photo of a purchase receipt.

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
      "confidence": 0.0,
      "sourceRef": { "photoIndex": 0 }
    }
  ]
}

Task:
Read the receipt image and extract its purchased line items as atomic ledger item drafts.

Rules:
1. Create one draft per distinct purchased line item visible on the receipt.
   If individual line items are not legible but a single total is, create one draft for the total with a combined description.
2. Use these exact field names: description, amountMinor, currency, type, occurredAt, category, confidence, sourceRef. Do NOT use any other field names.
3. currency is always "UAH".
4. amountMinor is signed kopiyky: 300 грн => 30000; 300.50 грн => 30050. Receipt purchases are expenses, so type is "expense" and amountMinor is NEGATIVE. Use "income" only for an explicit refund/return line.
5. description: the Ukrainian product/line name from the receipt. If unreadable, use a short relevant phrase or "Невідомо".
6. category: assign a short useful Ukrainian category from the item (food/groceries => "Їжа", pharmacy => "Здоровʼя", transport/fuel => "Транспорт", household => "Дім", etc.). If none can be inferred, use "Без категорії". Do not overuse "Без категорії".
7. occurredAt: if the receipt shows a purchase date/time, return it as ISO-8601. If absent, omit occurredAt. Do not invent dates.
8. confidence: a value in [0,1] reflecting how legible the line was.
9. sourceRef: include { "photoIndex": 0 } on each draft.
10. If the image is not a readable receipt or shows no purchase, return { "drafts": [] }.

Important:
- Always return JSON with a top-level "drafts" array.
- Never return prose, null, or unrecognized fields.
- Never use amount in hryvnias; always signed kopiyky.
- amountMinor and description are mandatory for each draft; skip any line with no amount.`;

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

    // Build messages first (a photo payload missing its image fails fast here,
    // before any timer/network resource is allocated).
    const messages = buildMessages(payload);

    // `fetch` resolves once headers arrive, but the body is streamed afterwards,
    // so the same AbortController must stay armed through `response.json()` — a
    // stalled body would otherwise hang `parse()` indefinitely. Clear the timer
    // only once parsing has fully completed.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const requestBody = JSON.stringify({
      model: this.model,
      response_format: { type: "json_object" },
      messages,
    });
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: requestBody,
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

type OpenAiMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "user";
      content: Array<
        { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
      >;
    };

/**
 * Selects the system prompt and user message shape by payload kind. Text/bank
 * payloads send the serialized content as a string; photo payloads send a vision
 * message with the receipt image as an `image_url` content part (FR-FILE-04).
 */
function buildMessages(payload: ParserPayload): OpenAiMessage[] {
  if (payload.kind === "photo") {
    if (!payload.image) {
      throw new ParsingError("adapter-failed", "Receipt photo payload is missing image data.");
    }
    return [
      { role: "system", content: OPENAI_VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: payload.content || "Розпізнай позиції чека." },
          { type: "image_url", image_url: { url: payload.image.dataUri } },
        ],
      },
    ];
  }
  return [
    { role: "system", content: OPENAI_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(payload) },
  ];
}
