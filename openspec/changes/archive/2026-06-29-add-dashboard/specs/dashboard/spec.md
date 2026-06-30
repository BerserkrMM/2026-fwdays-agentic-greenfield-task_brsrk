## MODIFIED Requirements

### Requirement: Dashboard aggregates cover the full history

All Dashboard figures SHALL be computed over the full history of non-deleted
ledger items (all-time). v1 SHALL NOT provide a period filter on the Dashboard.
A failure to load one aggregate SHALL degrade that section gracefully and SHALL
NOT blank or crash the whole page. (FR-DASH-01, FR-DASH-02, FR-DASH-03,
FR-DASH-04, FR-SHELL-03)

#### Scenario: Dashboard uses all-time data

- **WHEN** the Dashboard renders any summary, total, breakdown, or trend
- **THEN** it is computed from all non-deleted ledger items regardless of date
- **AND** no period selector restricts the figures

#### Scenario: A failed aggregate read degrades gracefully

- **WHEN** at least one aggregate read fails but the balance read succeeds
- **THEN** the Dashboard shows a partial-data state for the affected section
- **AND** the sections that loaded are still shown
- **AND** no data is created, updated, or deleted

#### Scenario: A failed primary read shows an explicit error state

- **WHEN** the primary balance read fails
- **THEN** the Dashboard shows an explicit error state with a way to retry
- **AND** the page does not render a blank screen or an unhandled error

### Requirement: Dashboard shows current balance summary

The Dashboard SHALL show the current balance summary from `ledger_items where
status != 'deleted'`. When there are no non-deleted items at all, the Dashboard
SHALL show an explicit empty state that guides the user to import data rather than
displaying fabricated figures. (FR-DASH-01, FR-LEDGER-02, FR-LEDGER-03,
FR-SHELL-03)

#### Scenario: Balance summary excludes deleted items

- **WHEN** the user opens the Dashboard
- **THEN** the balance summary is calculated from non-deleted ledger items
- **AND** deleted items are excluded

#### Scenario: Empty dashboard shows an onboarding state

- **GIVEN** there are no non-deleted ledger items
- **WHEN** the user opens the Dashboard
- **THEN** an explicit empty state is shown guiding the user to import data
- **AND** no balance, totals, breakdown, or trend figures are fabricated

### Requirement: Dashboard shows income and expense totals

The Dashboard SHALL show income and expense totals from non-deleted ledger items.
(FR-DASH-02, FR-LEDGER-04)

#### Scenario: Totals split income and expense

- **WHEN** dashboard totals are rendered
- **THEN** income totals come from positive non-deleted items
- **AND** expense totals come from negative non-deleted items

### Requirement: Dashboard shows category breakdown

The Dashboard SHALL show an expense (spend) breakdown grouped by raw
`LedgerItem.category` text, matching the design reference «Витрати за категоріями».
It SHALL include a `Без категорії` group when uncategorized items have spend, and
SHALL group by raw category text without a category-table join. (FR-DASH-03,
FR-CAT-04)

#### Scenario: Spend breakdown includes the uncategorized bucket

- **WHEN** non-deleted items include spending under category `Без категорії`
- **THEN** the category breakdown includes a `Без категорії` group
- **AND** grouping uses raw category text without a category-table join

#### Scenario: Breakdown is spend-only

- **WHEN** the breakdown renders
- **THEN** only categories with net spending (expenses) are shown
- **AND** income-only categories are excluded from the spend breakdown

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
