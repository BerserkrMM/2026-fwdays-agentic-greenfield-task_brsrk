// ParserRun — a record of one parse attempt over an InputEvent (FR-PARSE-08).
// Foundation owns the TYPE and table only; the run *behavior* (writing/retrying,
// normalized payload, result/error) is owned later by the `parsing` capability.
// Framework-free (TC-PURE-01).

export type ParserRunStatus = "success" | "failed";

export interface ParserRun {
  id: string;
  /** Must reference an existing InputEvent (referential ordering). */
  inputEventId: string;
  status: ParserRunStatus;
  /** Deterministically normalized payload sent to the parser. */
  normalizedPayload: string | null;
  /** Parser result JSON on success; null on failure. */
  resultJson: string | null;
  /** Error detail on failure; null on success. */
  error: string | null;
  createdAt: Date;
}

export type NewParserRun = Omit<ParserRun, "id" | "createdAt"> & {
  id?: string;
};
