# accounts

## Purpose

The Accounts capability owns account metadata, full account management (create,
edit, archive), and the single default account for Finup v1. It establishes the
UAH-only account records that ledger item creation can reference. Accounts have no
stored opening balance: balance display is coordinated with the Ledger capability
because balances are derived from non-deleted `ledger_items`, not stored
independently.

## Requirements

### Requirement: Account list and default account

The system SHALL let the user list accounts and SHALL maintain exactly one default
account. The default account is the fallback used when a ledger item is saved
without an explicit `account_id`. (FR-ACCT-01, FR-ITEM-06)

#### Scenario: Accounts list shows the default account

- **WHEN** the user opens the Accounts screen
- **THEN** the system lists the available accounts
- **AND** exactly one account is marked as the default account

#### Scenario: Default account is available to item creation

- **WHEN** an item creation request omits `account_id`
- **THEN** the accounts port can resolve the current default account
- **AND** the item creation contract can assign that account before saving the item

### Requirement: Account metadata is editable for v1

The system SHALL allow account metadata to be edited as needed for the v1
single-user, UAH-only product scope. Account metadata SHALL NOT introduce
multi-user ownership or non-UAH currencies in v1. (FR-ACCT-03, BC-SCOPE-01,
BC-SCOPE-02)

#### Scenario: User edits account metadata

- **WHEN** the user changes supported account metadata
- **THEN** the updated metadata is persisted
- **AND** the account remains a UAH account

#### Scenario: Non-UAH account currency is rejected

- **WHEN** account metadata is saved
- **THEN** the account currency remains `UAH`
- **AND** no alternate currency account is created in v1

### Requirement: User can create accounts and switch the default

The system SHALL let the user create new UAH accounts and SHALL let the user
switch which account is the default. The system SHALL always maintain exactly one
default account. (FR-ACCT-04, FR-ACCT-01)

#### Scenario: User creates a new account

- **WHEN** the user creates a new account with valid metadata
- **THEN** the account is persisted as a UAH account
- **AND** it appears in the active accounts list

#### Scenario: User switches the default account

- **GIVEN** more than one account exists
- **WHEN** the user marks a different account as the default
- **THEN** that account becomes the default
- **AND** the previously default account is no longer the default
- **AND** exactly one account remains the default

### Requirement: Account deletion is a soft archive

Deleting an account SHALL be a soft archive: the account SHALL be hidden from the
active accounts list and from default selection, while its ledger items and their
balance contribution SHALL be retained. The system SHALL NOT allow archiving the
current default account or the last remaining active account. (FR-ACCT-05)

#### Scenario: Archiving hides the account but keeps its items

- **GIVEN** an account that has ledger items
- **WHEN** the user deletes (archives) the account
- **THEN** the account is hidden from the active accounts list and default selection
- **AND** its non-deleted ledger items still contribute to the overall balance

#### Scenario: The default or last account cannot be archived

- **WHEN** the user attempts to archive the default account or the last remaining active account
- **THEN** the system rejects the action with an explicit message
- **AND** the account remains active

### Requirement: Seeded default account and no opening balance

A seeded default account (`Готівка`, UAH) SHALL exist at first run so item
creation works before the user creates any account, and it SHALL be editable and
renameable. Accounts SHALL NOT store an opening balance in v1; account balance is
derived only from non-deleted ledger items. (FR-ACCT-06, FR-LEDGER-05)

#### Scenario: Default account exists at first run

- **WHEN** the application initializes for the first time
- **THEN** a default `Готівка` UAH account exists
- **AND** item creation can resolve it as the default account

#### Scenario: Account balance has no stored opening value

- **WHEN** an account balance is displayed
- **THEN** it is computed from non-deleted ledger items only
- **AND** no stored opening-balance value contributes to it
