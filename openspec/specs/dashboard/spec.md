# dashboard

## Purpose

The Dashboard capability owns the read-only financial overview. It displays
balance summary, income/expense totals, category breakdown, and trends using
Ledger capability queries over non-deleted ledger items across the full history
(all-time; no period filter in v1). It never mutates ledger items, imports, or
accounts.

## Requirements

### Requirement: Dashboard aggregates cover the full history

All Dashboard figures SHALL be computed over the full history of non-deleted
ledger items (all-time). v1 SHALL NOT provide a period filter on the Dashboard.
(FR-DASH-01, FR-DASH-02, FR-DASH-03, FR-DASH-04)

#### Scenario: Dashboard uses all-time data

- **WHEN** the Dashboard renders any summary, total, breakdown, or trend
- **THEN** it is computed from all non-deleted ledger items regardless of date
- **AND** no period selector restricts the figures

### Requirement: Dashboard shows current balance summary

The Dashboard SHALL show the current balance summary from `ledger_items where
status != 'deleted'`. (FR-DASH-01, FR-LEDGER-02, FR-LEDGER-03)

#### Scenario: Balance summary excludes deleted items

- **WHEN** the user opens the Dashboard
- **THEN** the balance summary is calculated from non-deleted ledger items
- **AND** deleted items are excluded

### Requirement: Dashboard shows income and expense totals

The Dashboard SHALL show income and expense totals from non-deleted ledger items.
(FR-DASH-02, FR-LEDGER-04)

#### Scenario: Totals split income and expense

- **WHEN** dashboard totals are rendered
- **THEN** income totals come from positive non-deleted items
- **AND** expense totals come from negative non-deleted items

### Requirement: Dashboard shows category breakdown

The Dashboard SHALL show a category breakdown grouped by raw
`LedgerItem.category` text, including `Без категорії`. (FR-DASH-03, FR-CAT-04)

#### Scenario: Category breakdown includes uncategorized bucket

- **WHEN** non-deleted items include category `Без категорії`
- **THEN** the category breakdown includes a `Без категорії` group
- **AND** grouping uses raw category text without a category-table join

### Requirement: Dashboard shows trends when enough data exists

The Dashboard SHALL show trends as income/expense grouped by calendar month
(`Europe/Kyiv`) over all-time non-deleted data. Trends SHALL be shown when at
least two distinct months contain non-deleted items; otherwise an explicit
insufficient-data state SHALL be shown. (FR-DASH-04)

#### Scenario: Trends are available with sufficient history

- **GIVEN** non-deleted items span at least two distinct calendar months
- **WHEN** the Dashboard renders
- **THEN** monthly income/expense trend information is shown

#### Scenario: Trends handle insufficient data explicitly

- **GIVEN** non-deleted items span fewer than two distinct calendar months
- **WHEN** the Dashboard renders
- **THEN** the trend area shows an explicit empty or insufficient-data state

### Requirement: Dashboard is read-only

The Dashboard SHALL be read-only and SHALL NOT mutate ledger items, imports, or
accounts. (FR-DASH-05)

#### Scenario: Dashboard performs no mutations

- **WHEN** the Dashboard loads or refreshes
- **THEN** it only reads from ledger queries
- **AND** it does not create, update, approve, delete, import, or configure data
