# settings

## Purpose

The Settings capability owns the technical configuration screen for Finup v1. In
v1 it is scoped to AI-provider configuration and ledger-item export to CSV. It
exposes configuration without changing the single-user, UAH-only product scope and
provides no destructive data-reset action.

## Requirements

### Requirement: Settings screen manages technical configuration

The Settings screen SHALL manage technical configuration for the application. In
v1 the supported configuration is AI-provider settings and ledger-item export.
(FR-SET-01)

#### Scenario: User opens settings

- **WHEN** the user opens the Settings screen
- **THEN** the AI-provider configuration and data-export options are visible
- **AND** unsupported or unavailable settings show explicit disabled/empty states rather than blank UI

#### Scenario: User saves supported technical configuration

- **WHEN** the user changes supported technical configuration
- **THEN** the configuration is validated and persisted

### Requirement: AI provider settings are configurable if needed

AI provider settings SHALL be configurable for v1 operation, while the Parsing
capability remains responsible for the parser adapter boundary. The API key SHALL
be stored in the database and edited in Settings, and it SHALL be write-only over
the wire: the stored key value SHALL NOT be returned to the client, only its
configured/not-configured status. (FR-SET-02, FR-PARSE-06, NFR-COST-01)

#### Scenario: User configures AI provider settings

- **WHEN** AI provider configuration is required
- **THEN** Settings lets the user view the configuration status and update the provider settings
- **AND** Parsing consumes the resulting configuration through its adapter boundary

#### Scenario: Stored key is not returned to the client

- **WHEN** the Settings screen loads existing AI provider configuration
- **THEN** it shows whether a key is configured
- **AND** it does not return or display the stored key value

#### Scenario: Missing provider configuration is explicit

- **WHEN** required AI provider settings are missing or invalid
- **THEN** Settings shows an explicit configuration state
- **AND** the app does not silently attempt an invalid AI call

### Requirement: Ledger items can be exported to CSV

The Settings screen SHALL let the user export ledger items to a CSV file. v1 SHALL
NOT provide a destructive data-reset or clear action. (FR-SET-03)

#### Scenario: User exports ledger items

- **WHEN** the user triggers a data export
- **THEN** the system produces a CSV file of ledger items
- **AND** the export does not modify or delete any data

#### Scenario: No destructive reset is offered

- **WHEN** the user views the data section of Settings
- **THEN** no full-reset or clear-all action is available in v1
