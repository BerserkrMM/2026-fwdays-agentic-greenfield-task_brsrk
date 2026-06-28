# ledger

## Purpose

The Ledger capability owns read-side balance and aggregate queries over the
foundation-owned `ledger_items` schema. It treats `ledger_items` as the single
source of truth for balances and exposes reusable query behavior for Accounts and
Dashboard without mutating items.

## Requirements

### Requirement: Ledger item is the atomic financial row

The system SHALL treat a `ledger_item` as the atomic financial row in v1. There
SHALL NOT be a separate transaction or posting entity in the v1 domain model.
(FR-LEDGER-01)

#### Scenario: Ledger queries read ledger items directly

- **WHEN** a balance or aggregate is calculated
- **THEN** the calculation reads `ledger_items`
- **AND** it does not depend on a separate transaction or posting table

### Requirement: Balance inclusion follows item status

The system SHALL include `pending` and `approved` ledger items in balances and
SHALL exclude `deleted` ledger items from balances. (FR-LEDGER-02)

#### Scenario: Pending and approved items affect balance

- **GIVEN** ledger items with statuses `pending`, `approved`, and `deleted`
- **WHEN** a balance query runs
- **THEN** the `pending` and `approved` items contribute to the result
- **AND** the `deleted` item does not contribute to the result

### Requirement: Account and overall balance queries

The system SHALL provide balance queries for individual accounts and for the
overall ledger, using all non-deleted ledger items. (FR-LEDGER-03, FR-ACCT-02)

#### Scenario: Account balance is derived from non-deleted items

- **WHEN** the system displays an account balance
- **THEN** it uses ledger balance queries over non-deleted items for that account
- **AND** it does not use an independently maintained account balance field

#### Scenario: Overall balance is derived from all non-deleted items

- **WHEN** the system displays the overall balance
- **THEN** it sums all non-deleted ledger items across accounts

#### Scenario: Archived-account items still count toward the overall balance

- **GIVEN** an archived (soft-deleted) account with non-deleted ledger items
- **WHEN** the overall balance is computed
- **THEN** those items still contribute to the overall balance
- **AND** balance inclusion depends on item status, not on account archive state

### Requirement: Income and expense aggregates

The system SHALL provide income and expense aggregate queries for dashboard and
category totals from all non-deleted ledger items. (FR-LEDGER-04)

#### Scenario: Aggregates split income and expense totals

- **WHEN** aggregate totals are requested
- **THEN** positive `amount_minor` values are counted as income
- **AND** negative `amount_minor` values are counted as expenses
- **AND** deleted items are excluded

### Requirement: Ledger items are the single source of truth

The system SHALL treat ledger items as the single source of truth for balances;
no other module SHALL compute or persist an independent balance source.
(FR-LEDGER-05)

#### Scenario: Downstream modules use ledger queries

- **WHEN** Accounts or Dashboard needs balance data
- **THEN** it uses Ledger capability queries
- **AND** it does not duplicate balance calculation logic independently
