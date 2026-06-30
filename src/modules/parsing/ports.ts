// fallow-ignore-file unused-file -- intentional parsing module port surface for upcoming import-channel consumers (TC-MOD-01).
export type {
  AdapterParsingResult,
  ParserAdapter,
  ParserPayload,
  ParsingResult,
} from "@/src/domain/parsing";
export { ParsingError } from "@/src/domain/parsing";
export { ParsingService, type ParseInput } from "./service";
export { OpenAiParserAdapter, type OpenAiParserAdapterOptions } from "./adapters";
