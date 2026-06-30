# Eval decision — add-parsing-pipeline

No qualitative eval case is added for this slice.

Rationale: this slice is a deterministic parsing orchestration boundary. It does
not add user-facing UI copy, AI prompt output grading, or judgment behavior. The
OpenAI-compatible adapter is only a port/failure boundary here; real channel UX
and any prompt-quality evaluation belong to the channel slices that produce user
visible import summaries and parser outputs.

Coverage for this slice is via unit tests and reviewer checks over:
- deterministic privacy/noise normalization;
- adapter-boundary failure recording;
- draft validation/canonicalization;
- parser_run success/failure/retry behavior;
- no ledger writes from parsing.
