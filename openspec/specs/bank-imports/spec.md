# bank-imports

## Purpose

The Bank Imports capability owns the `/imports/bank` channel for CSV/XLS/XLSX
statement uploads. It records the original statement as an input event, captures
the selected provider, performs provider-specific deterministic normalization,
invokes Parsing, and creates pending ledger items while preserving row-level
idempotency.
## Requirements
### Requirement: User uploads a bank statement file

The system SHALL let the user upload a CSV/XLS/XLSX statement file on
`/imports/bank`, and the uploaded file SHALL be stored as an `input_event`. The
system SHALL validate the file type and SHALL NOT impose a hard file-size limit in
v1. (FR-BANK-01, FR-IMPORT-02)

#### Scenario: Statement file is preserved

- **WHEN** the user uploads a supported bank statement file
- **THEN** the original input is stored as an `input_event`
- **AND** parsing does not begin before the original input has been preserved

#### Scenario: Unsupported file type is rejected

- **WHEN** the user uploads a file whose type is not CSV/XLS/XLSX
- **THEN** the system rejects it with an explicit validation message
- **AND** no `input_event` parsing proceeds for the rejected file

### Requirement: User selects statement provider

The user SHALL select the provider (`monobank` or `privatbank`) before import,
and the selected provider SHALL be recorded on the `input_event`. (FR-BANK-02)

#### Scenario: Provider is recorded with the input event

- **WHEN** the user starts a bank import
- **THEN** the user chooses `monobank` or `privatbank`
- **AND** the chosen provider is stored with the input event metadata

#### Scenario: Unsupported provider is rejected

- **WHEN** the user submits a provider other than `monobank` or `privatbank`
- **THEN** the system rejects it with an explicit Ukrainian validation message
- **AND** no `input_event` is created

### Requirement: Provider-specific normalization is deterministic and limited

Provider-specific deterministic normalization SHALL only remove obvious
non-transaction rows/columns and prepare clean rows with source row numbers for
AI parsing. It SHALL NOT categorize, infer final item types, create items, or
write to the ledger. (FR-BANK-03)

#### Scenario: Normalization prepares clean rows

- **WHEN** a supported statement is normalized
- **THEN** obvious header/footer/non-transaction rows and irrelevant columns are removed
- **AND** each clean row retains its source row number where available
- **AND** no ledger items are created during normalization

#### Scenario: Empty normalized statement is rejected

- **WHEN** provider-specific normalization finds no transaction rows
- **THEN** the system reports that no rows are available to import
- **AND** no parser call or ledger-item creation is attempted

### Requirement: Parsed statement rows create pending items

Clean rows SHALL be passed to the AI parser. The parser is expected to return at
most one ledger item per source row, and the document result SHALL create one
`pending` ledger item per parsed statement row. (FR-BANK-04, FR-PARSE-01,
FR-PARSE-07)

#### Scenario: Statement rows are parsed into pending items

- **WHEN** normalized bank rows are parsed successfully
- **THEN** each parsed row produces at most one ledger item draft
- **AND** each valid draft is saved as a pending ledger item through the item-creation contract using partial-success batch creation

#### Scenario: Draft without source row is counted as failed

- **WHEN** parsing returns a draft for a bank statement without a source row number
- **THEN** that draft is not inserted as a bank row item
- **AND** the import summary counts it as failed without rolling back already-created rows

### Requirement: Bank imports review happens in ledger

Bank-statement imports SHALL NOT require a separate preview step; after import the
system SHALL navigate the user to the Ledger screen with a summary of created and
failed item counts, where the user can review, approve, edit, or delete the
resulting items. (FR-BANK-05, FR-ITEM-03, FR-ITEM-04, FR-ITEM-05)

#### Scenario: Import completes without preview gate

- **WHEN** bank import processing completes
- **THEN** the user is redirected to the Ledger screen with a created/failed summary
- **AND** the resulting pending items are available for review and change there

### Requirement: Bank parsing failure is surfaced with retry

If parsing the statement fails, the system SHALL show an explicit error with a
retry action, and the original `input_event` and the failed `parser_run` SHALL be
preserved for a later retry. (FR-BANK-04, FR-PARSE-08, FR-ITEM-07)

#### Scenario: Statement parse fails

- **WHEN** parsing the normalized statement rows fails
- **THEN** an explicit error message with a retry action is shown
- **AND** the original `input_event` and a failed `parser_run` are preserved

### Requirement: Retried bank parses do not duplicate source rows

The `(input_event_id, import_row_number)` pair SHALL be unique so retrying a parse
does not duplicate statement rows. Retry behavior SHALL be insert-if-absent: any
source row that already produced a ledger item — in any status (`pending`,
`approved`, or `deleted`) — SHALL be skipped, so no existing item is overwritten.
Foundation owns the database constraint; Bank Imports owns the insert-if-absent
retry behavior for bank rows. (FR-BANK-06)

#### Scenario: Retry skips rows that already produced an item

- **GIVEN** a bank input event has already created an item for a source row number
- **WHEN** the same input event is retried
- **THEN** that source row is skipped and not inserted as a duplicate item
- **AND** the existing item (whether `pending`, `approved`, or `deleted`) is left unchanged

#### Scenario: Retry creates items only for rows without one

- **GIVEN** a partially imported statement where some rows have no item yet
- **WHEN** the input event is retried
- **THEN** items are created only for source rows that do not yet have an item

