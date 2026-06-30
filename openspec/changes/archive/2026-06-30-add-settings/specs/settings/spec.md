## MODIFIED Requirements

### Requirement: Settings screen manages technical configuration

The Settings screen SHALL manage technical configuration for the application. In
v1 the supported configuration is AI-provider settings and ledger-item CSV export.
The screen SHALL show explicit configured / not-configured states rather than
blank UI, SHALL validate and persist supported changes, and SHALL surface a clear
Ukrainian-first message on invalid input instead of an unhandled error.
(FR-SET-01, FR-SHELL-03, NFR-I18N-01)

#### Scenario: User opens settings

- **WHEN** the user opens the Settings screen
- **THEN** the AI-provider configuration and data-export options are visible
- **AND** unsupported or unavailable settings show explicit disabled/empty states rather than blank UI

#### Scenario: User saves supported technical configuration

- **WHEN** the user changes supported technical configuration
- **THEN** the configuration is validated and persisted

#### Scenario: Invalid configuration is surfaced clearly

- **WHEN** the user submits invalid configuration
- **THEN** Settings shows an explicit Ukrainian-first error describing what to fix
- **AND** no input produces a blank screen or an unhandled error

### Requirement: AI provider settings are configurable if needed

AI provider settings SHALL be configurable for v1 operation, while the Parsing
capability remains responsible for the parser adapter boundary. The API key SHALL
be stored in the database and edited in Settings, and it SHALL be write-only over
the wire: the stored key value SHALL NOT be returned to the client, only its
configured/not-configured status. Submitting a blank key SHALL leave the stored
key unchanged, and the user SHALL be able to remove a stored key. Parsing SHALL
consume the stored configuration through its adapter boundary, falling back to
environment configuration when none is stored. (FR-SET-02, FR-PARSE-06, NFR-COST-01)

#### Scenario: User configures AI provider settings

- **WHEN** AI provider configuration is required
- **THEN** Settings lets the user view the configuration status and update the provider settings
- **AND** Parsing consumes the resulting configuration through its adapter boundary

#### Scenario: Stored key is not returned to the client

- **WHEN** the Settings screen loads existing AI provider configuration
- **THEN** it shows whether a key is configured
- **AND** it does not return or display the stored key value

#### Scenario: Blank key submission preserves the stored key

- **WHEN** the user saves the provider form without entering a new key
- **THEN** the previously stored key is left unchanged
- **AND** the configured status does not change

#### Scenario: User removes the stored key

- **WHEN** the user removes the stored AI provider key
- **THEN** the configured status becomes not-configured
- **AND** the stored key value is cleared

#### Scenario: Missing provider configuration is explicit

- **WHEN** required AI provider settings are missing or invalid
- **THEN** Settings shows an explicit configuration state
- **AND** the app does not silently attempt an invalid AI call

### Requirement: Ledger items can be exported to CSV

The Settings screen SHALL let the user export ledger items to a CSV file. The
export SHALL be read-only — it SHALL NOT modify or delete any data — and SHALL
neutralize spreadsheet formula-injection in exported text fields while quoting
fields per RFC 4180. v1 SHALL NOT provide a destructive data-reset or clear
action. (FR-SET-03, FR-CAT-04)

#### Scenario: User exports ledger items

- **WHEN** the user triggers a data export
- **THEN** the system produces a CSV file of ledger items
- **AND** the export does not modify or delete any data

#### Scenario: Export neutralizes spreadsheet formula injection

- **WHEN** an exported text field begins with a spreadsheet formula trigger (`=`, `+`, `-`, `@`, tab, or carriage return)
- **THEN** the field is escaped so a spreadsheet treats it as text, not a formula
- **AND** field values containing commas, quotes, or newlines are quoted per RFC 4180

#### Scenario: No destructive reset is offered

- **WHEN** the user views the data section of Settings
- **THEN** no full-reset or clear-all action is available in v1
