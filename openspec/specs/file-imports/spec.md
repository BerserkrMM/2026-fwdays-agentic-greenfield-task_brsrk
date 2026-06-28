# file-imports

## Purpose

The File Imports capability owns the `/imports/files` receipt-photo channel. It
allows one receipt photo per v1 input event, preserves the original file
reference, applies deterministic non-AI preprocessing where possible, invokes AI
vision parsing, and creates pending ledger items from parsed receipt drafts.

## Requirements

### Requirement: User uploads one receipt photo

The system SHALL let the user upload one receipt photo on `/imports/files`.
Multiple-photo receipts are out of scope for v1. The system SHALL validate the
file type (image) and SHALL NOT impose a hard file-size limit in v1. (FR-FILE-01)

#### Scenario: Single photo upload is accepted

- **WHEN** the user opens `/imports/files`
- **THEN** the user can upload one receipt photo
- **AND** the UI does not require or accept a multi-photo receipt flow for v1

#### Scenario: Non-image file is rejected

- **WHEN** the user uploads a file whose type is not an image
- **THEN** the system rejects it with an explicit validation message
- **AND** no parsing proceeds for the rejected file

### Requirement: Original photo reference is stored as an input event

The original file reference SHALL be stored as an `input_event` with source
`photo`, including `storage_uri` and `mime_type`. (FR-FILE-02, FR-IMPORT-02,
NFR-PRIV-02)

#### Scenario: Photo input event preserves file metadata

- **WHEN** the user uploads a receipt photo
- **THEN** the original file reference is stored before parsing
- **AND** the input event source is `photo`
- **AND** `storage_uri` and `mime_type` are recorded

### Requirement: Deterministic photo preprocessing precedes AI where possible

Deterministic, non-AI preprocessing SHALL be applied before any AI call where
possible, including validation and avoidable metadata stripping. The original
file reference SHALL remain preserved on the `input_event`. (FR-FILE-03)

#### Scenario: Photo is validated and preprocessed

- **WHEN** a receipt photo is prepared for parsing
- **THEN** deterministic validation and safe preprocessing run before the AI call where applicable
- **AND** the original file reference remains preserved unchanged on the input event

### Requirement: AI vision parser extracts receipt item drafts

An AI vision parser SHALL be invoked on the normalized/preprocessed payload to
extract receipt line items and item metadata. (FR-FILE-04, FR-PARSE-01,
FR-PARSE-02)

#### Scenario: Vision parser returns receipt drafts

- **WHEN** a valid preprocessed receipt photo is parsed
- **THEN** the parser returns ledger item drafts for recognized receipt line items
- **AND** available item metadata is included in the drafts

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
provider, a missing API key, or an invalid response) with an explicit error and a
retry action, and SHALL preserve the original `input_event` and the failed
`parser_run` for a later retry. (FR-FILE-04, FR-PARSE-08, FR-ITEM-07)

#### Scenario: Receipt parse fails

- **WHEN** vision parsing of the receipt photo fails
- **THEN** an explicit error message with a retry action is shown
- **AND** the original `input_event` and a failed `parser_run` are preserved

### Requirement: User is taken to the ledger after import

After a receipt import completes, the system SHALL navigate the user to the Ledger
screen, surfacing a summary of how many items were created and how many failed.
(FR-FILE-05)

#### Scenario: Import redirects to ledger with a summary

- **WHEN** receipt import completes
- **THEN** the user is redirected to the Ledger screen
- **AND** a summary of created and failed item counts is shown
- **AND** the created pending items are visible there
