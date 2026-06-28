# parsing

## Purpose

The Parsing capability owns the parser port, OpenAI v1 adapter, deterministic
privacy/noise normalization immediately before AI calls, `parser_run` behavior,
and the drafts-only parsing contract. It consumes normalized input-event payloads
from import channels and never writes ledger items directly.

## Requirements

### Requirement: Parser consumes normalized input-event payloads

The parser SHALL consume a normalized `InputEvent` payload and return a
`ParsingResult` containing ledger item drafts. (FR-PARSE-01)

#### Scenario: Normalized payload is parsed

- **GIVEN** an import channel has stored an `input_event` and prepared a normalized payload
- **WHEN** the parser is invoked
- **THEN** it returns a parsing result with zero or more ledger item drafts

### Requirement: Parser extracts atomic ledger item fields

The parser SHALL extract atomic ledger item drafts with `description`, signed
`amount_minor`, operation type (`expense` or `income`), date when known, and
source reference where available. (FR-PARSE-02)

#### Scenario: Draft contains canonical item fields

- **WHEN** parsing succeeds for a financial row or receipt line
- **THEN** each draft includes description, signed amount, type, currency, and category
- **AND** it includes `occurredAt` and `sourceRef` when those values are known

### Requirement: Parser category output is preserved or defaulted

The parser SHALL return category text as-is when it can; if it returns no
category, the created item category SHALL be `Без категорії`. (FR-PARSE-03,
FR-CAT-02, FR-CAT-03)

#### Scenario: Parser returns category text

- **WHEN** a parser draft includes a category
- **THEN** downstream item creation stores that category text as-is

#### Scenario: Parser omits category text

- **WHEN** a parser draft has no category
- **THEN** downstream item creation stores `Без категорії`

### Requirement: Parser confidence is preserved when available

Each item draft SHALL carry an AI confidence score in `[0,1]` when the adapter
provides one. The score SHALL be persisted with the item, but v1 SHALL NOT surface
it in the user interface. (FR-PARSE-04)

#### Scenario: Adapter returns confidence

- **WHEN** the parser adapter returns a confidence score for a draft
- **THEN** the parsing result exposes that score unchanged
- **AND** the score is within `[0,1]`

#### Scenario: Confidence is not shown in the v1 UI

- **WHEN** a ledger item created from a draft is displayed
- **THEN** the stored confidence value is not shown to the user
- **AND** no confidence threshold filters or hides the item

### Requirement: Privacy and noise normalization precedes AI calls

Deterministic privacy/noise normalization SHALL run before AI calls where
applicable, without requiring personal-data keys. (FR-PARSE-05, NFR-PRIV-01)

#### Scenario: Payload is normalized before adapter call

- **WHEN** a payload is about to be sent to the AI adapter
- **THEN** deterministic privacy/noise normalization runs first where applicable
- **AND** the adapter receives the normalized payload

### Requirement: Parser exposes an adapter boundary

OpenAI SHALL be the v1 parser adapter, and the parser SHALL expose an adapter
boundary for a future local LLM. (FR-PARSE-06, TC-STACK-05)

#### Scenario: OpenAI adapter is used through a port

- **WHEN** parsing invokes the v1 AI adapter
- **THEN** the call goes through the parser adapter boundary
- **AND** product code is not coupled directly to a single provider implementation

### Requirement: Parser never writes ledger items directly

The parser SHALL never write ledger items directly; it SHALL only return drafts
through its port. (FR-PARSE-07)

#### Scenario: Parser returns drafts only

- **WHEN** parsing succeeds
- **THEN** it returns drafts to the caller
- **AND** ledger item creation is performed by the import channel through the item-creation contract

### Requirement: Parse attempts are recorded as parser runs

Every parse attempt SHALL be recorded as a `parser_run` with status (`success` or
`failed`), normalized payload, result JSON or error, and retry support.
(FR-PARSE-08, NFR-PRIV-02)

#### Scenario: Successful parse is recorded

- **WHEN** a parse attempt succeeds
- **THEN** a `parser_run` records status `success`, the normalized payload, and result JSON

#### Scenario: Failed parse is recorded and retryable

- **WHEN** a parse attempt fails
- **THEN** a `parser_run` records status `failed` and the error
- **AND** the original `input_event` can be used for a later retry
