## MODIFIED Requirements

### Requirement: User uploads one receipt photo

The system SHALL let the user upload one receipt photo on `/imports/files`.
Multiple-photo receipts are out of scope for v1. The system SHALL validate that
the upload is a supported image (JPEG, PNG, or WEBP) by inspecting its content
(magic bytes), not by trusting the client-supplied name or MIME, and SHALL NOT
impose a hard file-size limit in v1. (FR-FILE-01)

#### Scenario: Single photo upload is accepted

- **WHEN** the user opens `/imports/files`
- **THEN** the user can upload one receipt photo
- **AND** the UI does not require or accept a multi-photo receipt flow for v1

#### Scenario: Non-image file is rejected

- **WHEN** the user uploads a file whose content is not a supported image (for
  example a PDF, a text file, or an empty file)
- **THEN** the system rejects it with an explicit Ukrainian validation message
- **AND** no `input_event` is parsed for the rejected file

### Requirement: Original photo reference is stored as an input event

The original file reference SHALL be stored as an `input_event` with source
`photo`, including `storage_uri` and `mime_type`, before any parsing. In v1 the
original bytes are preserved as a `data:` URI in `storage_uri` and the detected
image type is recorded in `mime_type`. (FR-FILE-02, FR-IMPORT-02, NFR-PRIV-02)

#### Scenario: Photo input event preserves file metadata

- **WHEN** the user uploads a valid receipt photo
- **THEN** the original file reference is stored before parsing begins
- **AND** the input event source is `photo`
- **AND** `storage_uri` holds the original bytes and `mime_type` the detected image type

### Requirement: Deterministic photo preprocessing precedes AI where possible

Deterministic, non-AI preprocessing SHALL run before any AI call, including image
validation and magic-byte MIME detection, and SHALL send the isolated image plus
receipt-parser instructions/source-reference metadata to the AI parser, without
surrounding raw text or other input-event context. The original file reference
SHALL remain preserved unchanged on the `input_event`. The raw image is NOT
re-persisted into `parser_runs.normalized_payload` (only its type and size are
kept there) to avoid duplicating the blob. Binary EXIF/metadata stripping is
deferred in v1 — embedded image metadata (e.g. EXIF) is therefore NOT
removed before the image is sent to the AI provider; no AI is used for
preprocessing. (FR-FILE-03, BC-PRIVACY-01, NFR-PRIV-01)

#### Scenario: Photo is validated and preprocessed

- **WHEN** a receipt photo is prepared for parsing
- **THEN** deterministic validation and magic-byte MIME detection run before the AI call
- **AND** the isolated image is sent to the AI parser with only parser instructions/source-reference metadata, not surrounding raw text or other input-event context
- **AND** the raw image base64 is not duplicated into the stored normalized parser payload
- **AND** the original file reference remains preserved unchanged on the input event

### Requirement: AI vision parser extracts receipt item drafts

An AI vision parser SHALL be invoked on the preprocessed image payload to extract
receipt line items and item metadata. The parser is reached through the existing
OpenAI-compatible adapter boundary using a `photo`-kind payload that carries the
image. (FR-FILE-04, FR-PARSE-01, FR-PARSE-02, FR-PARSE-06)

#### Scenario: Vision parser returns receipt drafts

- **WHEN** a valid preprocessed receipt photo is parsed
- **THEN** the adapter invokes a vision parse with the image payload
- **AND** the parser returns ledger item drafts for recognized receipt line items
- **AND** available item metadata (amount, date when present, category) is included in the drafts

### Requirement: Parsed receipt drafts become pending ledger items

Parsed receipt item drafts SHALL be created as `pending` ledger items via the
item-creation contract, using partial-success batch creation. (FR-FILE-05,
FR-PARSE-07, FR-ITEM-04)

#### Scenario: Receipt drafts are saved as pending items

- **WHEN** the vision parser returns receipt drafts
- **THEN** the file import channel creates one pending ledger item per valid draft through the item-creation contract
- **AND** invalid drafts are counted as failures without rolling back saved items

### Requirement: Receipt parsing failure is surfaced with retry

The system SHALL surface vision-parsing failures (for example an unavailable AI
provider, a missing API key, or an invalid response) with an explicit Ukrainian
error and a retry action, and SHALL preserve the original `input_event` and the
failed `parser_run` for a later retry. (FR-FILE-04, FR-PARSE-08, FR-ITEM-07)

#### Scenario: Receipt parse fails

- **WHEN** vision parsing of the receipt photo fails
- **THEN** an explicit error message with a retry action is shown
- **AND** the original `input_event` and a failed `parser_run` are preserved

### Requirement: User is taken to the ledger after import

After a receipt import completes, the system SHALL navigate the user to the Ledger
screen, surfacing a summary of how many items were created and how many failed.
There SHALL be no separate preview/approval gate. (FR-FILE-05)

#### Scenario: Import redirects to ledger with a summary

- **WHEN** receipt import completes
- **THEN** the user is redirected to the Ledger screen
- **AND** a summary of created and failed item counts is shown
- **AND** the created pending items are visible there for review
