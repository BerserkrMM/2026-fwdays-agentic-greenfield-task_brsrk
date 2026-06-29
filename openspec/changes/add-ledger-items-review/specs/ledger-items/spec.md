## MODIFIED Requirements

### Requirement: Ledger screen lists item status

The system SHALL list ledger items on the Ledger screen and show each item's
status: `pending`, `approved`, or `deleted`. The list SHALL be sorted newest-first
by the item's effective operation date (`occurred_at` when set, otherwise the
creation time) and SHALL be paginated with incremental loading (a page size of
about 10 items, loading more on demand). `deleted` items SHALL remain visible in
the list as a log. (FR-ITEM-01)

#### Scenario: User sees item statuses

- **WHEN** the user opens the Ledger screen
- **THEN** ledger items are listed sorted newest-first by their effective date
- **AND** each row shows whether the item is `pending`, `approved`, or `deleted`

#### Scenario: List loads incrementally

- **GIVEN** more ledger items match than one page (about 10)
- **WHEN** the user requests more from the end of the loaded list
- **THEN** the next items are appended in newest-first order
- **AND** previously loaded items remain visible

#### Scenario: Empty journal shows an explicit empty state

- **GIVEN** no ledger items exist
- **WHEN** the user opens the Ledger screen
- **THEN** an explicit empty state is shown rather than a blank screen

### Requirement: Ledger list supports filtering and search

The ledger list SHALL support filtering by status, operation type
(`income`/`expense`), account, category text, and `occurred_at` date range, and
SHALL support free-text search over the item description. Filters SHALL be
combinable, and pagination and newest-first sorting SHALL apply to the filtered
result. (FR-ITEM-02)

#### Scenario: User filters by the supported fields

- **WHEN** the user applies any combination of status, type, account, category, or date-range filters
- **THEN** the list updates to ledger items matching all applied filters
- **AND** item status remains visible in the filtered results

#### Scenario: User searches item descriptions

- **WHEN** the user enters a free-text search term
- **THEN** the list updates to items whose description matches the term (case-insensitive)
- **AND** the search combines with any active filters

#### Scenario: Filtered results stay sorted and paginated

- **WHEN** a filter or search is active
- **THEN** results remain sorted newest-first by effective date
- **AND** incremental pagination applies to the filtered result

### Requirement: User can edit pending or approved items

The system SHALL let the user open and edit any field of a `pending` or
`approved` ledger item: description, signed `amount_minor` (entered as an absolute
amount plus operation type), operation type (`income`/`expense`), category,
`occurred_at`, and account. Editing SHALL validate input: description SHALL be
non-empty, the amount SHALL be a parseable positive value, `occurred_at` SHALL be
provided (it is mandatory), the account SHALL be an active account, and a blank
category SHALL default to `Без категорії`. Editing an `approved` item SHALL NOT
change its status back to `pending`; it SHALL remain `approved`. A `deleted` item
SHALL NOT be editable. (FR-ITEM-03, FR-CAT-01, FR-CAT-03)

#### Scenario: User edits an existing item

- **GIVEN** a ledger item with status `pending` or `approved`
- **WHEN** the user edits any supported field with valid input and saves
- **THEN** the item is persisted with the updated values
- **AND** the stored `amount_minor` sign matches the operation type

#### Scenario: Editing an approved item keeps it approved

- **GIVEN** a ledger item with status `approved`
- **WHEN** the user edits one of its fields and saves
- **THEN** the item is persisted with the updated values
- **AND** its status remains `approved`

#### Scenario: Invalid edit is rejected with a clear message

- **WHEN** the user saves an edit with an empty description, an unparseable amount, or no date
- **THEN** the edit is rejected with a specific Ukrainian error message
- **AND** no partial change is persisted

#### Scenario: Blank category defaults on edit

- **WHEN** the user saves an edit leaving the category blank
- **THEN** the item stores `Без категорії`

### Requirement: User can approve pending items

The system SHALL let the user approve a `pending` item by setting its status to
`approved`. Approving an item that is not `pending` SHALL be rejected. Both
`pending` and `approved` items SHALL affect balances. (FR-ITEM-04)

#### Scenario: Pending item is approved

- **GIVEN** a ledger item with status `pending`
- **WHEN** the user approves the item
- **THEN** the item status becomes `approved`
- **AND** it continues to affect balances

#### Scenario: Approving a non-pending item is rejected

- **GIVEN** a ledger item with status `approved` or `deleted`
- **WHEN** an approve action is attempted on it
- **THEN** the action is rejected and the status is unchanged

### Requirement: User can delete items without erasing the log

The system SHALL let the user delete an item by setting status to `deleted`.
Deleting SHALL be idempotent. Deleted items SHALL NOT affect balances but SHALL
remain available as a log in the ledger list. (FR-ITEM-05)

#### Scenario: Deleted item is excluded from balances

- **WHEN** the user deletes a ledger item
- **THEN** the item status becomes `deleted`
- **AND** balance and aggregate queries exclude it
- **AND** the item remains visible in the ledger list as a log
