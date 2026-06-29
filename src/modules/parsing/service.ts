import {
  canonicalizeParserDrafts,
  normalizeParserPayload,
  type ParserAdapter,
  type ParserPayload,
  ParsingError,
  type ParsingResult,
} from "@/src/domain/parsing";
import type { Repositories } from "@/src/domain/ports";

export interface ParseInput {
  inputEventId: string;
  payload: ParserPayload;
}

export class ParsingService {
  constructor(
    private readonly repos: Repositories,
    private readonly adapter: ParserAdapter,
  ) {}

  async parse(input: ParseInput): Promise<ParsingResult> {
    const event = await this.repos.inputEvents.findById(input.inputEventId);
    if (!event) {
      throw new ParsingError(
        "input-event-not-found",
        `input-event-not-found: ${input.inputEventId}`,
      );
    }

    const normalizedPayload = normalizeParserPayload(input.payload);
    const serializedPayload = stableJson(normalizedPayload);

    try {
      const adapterResult = await this.adapter.parse(normalizedPayload);
      const drafts = canonicalizeParserDrafts(adapterResult.drafts);
      const parserRun = await this.repos.parserRuns.create({
        inputEventId: event.id,
        status: "success",
        normalizedPayload: serializedPayload,
        resultJson: stableJson({ drafts }),
        error: null,
      });
      return { parserRun, drafts };
    } catch (cause) {
      const message = errorMessage(cause);
      await this.repos.parserRuns.create({
        inputEventId: event.id,
        status: "failed",
        normalizedPayload: serializedPayload,
        resultJson: null,
        error: message,
      });
      if (cause instanceof ParsingError) throw cause;
      throw new ParsingError("adapter-failed", message);
    }
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
