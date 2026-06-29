## MODIFIED Requirements

### Requirement: User submits free-form text

The system SHALL let the user submit free-form financial text on `/imports/text`,
for example `40 грн ковбаса, 20 грн хліб`. A submission whose text is empty or
whitespace-only SHALL be rejected with an explicit Ukrainian error and SHALL NOT
create an `input_event`. (FR-TEXT-01)

#### Scenario: Text import form accepts user text

- **WHEN** the user opens `/imports/text`
- **THEN** a text input form is available
- **AND** the user can submit a non-empty free-form text entry

#### Scenario: Empty submission is rejected

- **WHEN** the user submits empty or whitespace-only text
- **THEN** an explicit Ukrainian validation error is shown
- **AND** no `input_event` is created

### Requirement: Submitted text is stored as an input event

Submitted text SHALL be stored as an `input_event` with source `text`, preserving
the original text, before any source normalization or parsing. (FR-TEXT-02,
FR-IMPORT-02, NFR-PRIV-02)

#### Scenario: Original text is preserved

- **WHEN** the user submits non-empty text
- **THEN** the original text is stored on an `input_event`
- **AND** the input event source is `text`
- **AND** the original text is preserved before normalization or parsing

### Requirement: Stored text is normalized and parsed

The stored text SHALL be source-normalized and the normalized payload passed to
the Parsing capability to produce ledger item drafts. (FR-TEXT-03, FR-PARSE-01)

#### Scenario: Text payload reaches parser

- **GIVEN** submitted text has been stored as an `input_event`
- **WHEN** the manual input channel processes it
- **THEN** text-specific normalization prepares the payload with kind `text`
- **AND** the normalized payload is passed to the Parsing capability

### Requirement: Parser drafts become pending ledger items

Each parser draft SHALL be created as a `pending` ledger item via the
item-creation contract, using partial-success batch creation. (FR-TEXT-04,
FR-PARSE-07, FR-ITEM-04)

#### Scenario: Drafts are saved as pending items

- **WHEN** parsing returns ledger item drafts for submitted text
- **THEN** the manual input channel creates one pending ledger item per valid draft via the shared item-creation contract
- **AND** a draft that fails creation is counted as a failure without rolling back already-saved items

### Requirement: Parsing failure is surfaced with retry

The system SHALL surface text-parsing failures (for example an unavailable AI
provider, a missing API key, or an invalid response) with an explicit Ukrainian
error and a retry action, and SHALL preserve the original `input_event` and the
failed `parser_run` for a later retry. (FR-TEXT-03, FR-PARSE-08, FR-ITEM-07)

#### Scenario: Text parse fails

- **WHEN** parsing the submitted text fails
- **THEN** an explicit Ukrainian error message with a retry action is shown on `/imports/text`
- **AND** the original `input_event` and a failed `parser_run` are preserved

### Requirement: User is taken to the ledger after import

After a text import completes, the system SHALL navigate the user to the Ledger
screen, surfacing a summary of how many items were created and how many failed.
(FR-TEXT-05)

#### Scenario: Submission redirects to ledger with a summary

- **WHEN** text import completes
- **THEN** the user is redirected to the Ledger screen
- **AND** a summary of created and failed item counts is shown
- **AND** the created pending items are visible there
