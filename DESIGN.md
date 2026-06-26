# Finup — Design Reference

Canonical UI/UX reference for Finup. Any agent creating or refactoring UI reads this
file first. It is the design counterpart to `docs/product-brief.md` and
`docs/requirements.md` (the product source of truth) and adapts the bundled visual
reference to **our** domain model.

> **Why this file exists.** We like the visual language of the bundled reference
> (`design_instructions_and_JSX_reference/` in the sibling impl) — calm financial
> minimalism, rounded cards, soft shadows, clear badges. But that reference was
> drawn against an **older domain model** (`pending → posted transaction`,
> confirm/reject, a category CRUD screen). Finup v1 uses a **different** model
> (ledger items with `pending`/`approved`/`deleted`, approve/delete, category as
> free text). This file keeps the look and corrects the model. See
> [§11 Divergences](#11-divergences-from-the-bundled-reference).

---

## 1. The domain model the UI must reflect

This is the part the bundled reference gets wrong. Treat it as non-negotiable.

- The atomic financial row is a **ledger item** (`журнал операцій`), **not** a
  "transaction". There is no separate pending/posted transaction entity
  (FR-LEDGER-01).
- A ledger item has: `description`, signed `amount_minor` (kopiyky; expense
  negative, income positive), `UAH`, operation type (`expense`/`income`), account,
  **category as free text**, date when known, and **status**.
- Status lifecycle and balance effect:

  | Status | UA label | In balance/dashboard? | Meaning |
  | --- | --- | --- | --- |
  | `pending` | `Очікує перевірки` | **Yes** | Created by parsing or manual input; not yet reviewed. |
  | `approved` | `Підтверджено` | **Yes** | User reviewed and agreed. |
  | `deleted` | `Видалено` | **No** | Removed from the picture; kept as an audit log. |

- Lifecycle actions are **Підтвердити** (approve) and **Видалити** (delete) —
  **never** "confirm as posted" / "reject". `pending` already affects the balance;
  approving is agreement, not posting (BC-SCOPE-04).
- **Category is free text on the item** (FR-CAT-01..04). There is **no category
  table** and **no category management screen** in v1. Empty category stores
  `Без категорії`. Category breakdown groups by the raw text.
- Account: if the user picks none, the **default account** is assigned before save
  (FR-ITEM-06). UAH-only, `Europe/Kyiv`, single-user, no auth (BC-SCOPE-01..03).
- Pipeline every input flows through and what the UI visualizes:

  ```txt
  input_event → deterministic normalization → parser_run → pending ledger_items → review → approved/deleted
  ```

  Raw input is always preserved on the `input_event` and traceable from each item.

---

## 2. Design direction

- Calm, minimal, finance-oriented. Light theme primary; dark theme compatible.
- One living accent (emerald), no "game" brightness.
- PWA-first: the installed mobile app is a first-class scenario, not desktop-only.
- Clear navigation and one obvious primary action per screen.
- Touch-friendly: tap targets ≥ 44px, mobile-safe spacing, **no hover-only**
  actions (NFR-A11Y-01).
- One consistent system for success / error / warning / info / confirm.
- Ukrainian-first copy (NFR-I18N-01, BC-BRAND-01).

---

## 3. Design tokens (`--fin-*`)

Palette lifted from the bundled reference (its real inline colors), expressed as
CSS custom properties. Define these in `app/globals.css` via a Foundation change
(TC-MOD-02); feature code consumes tokens, never raw hex.

```css
:root {
  /* surfaces */
  --fin-bg:            #f7faf8; /* warm off-white / light mint app background */
  --fin-bg-subtle:     #eef3f0; /* sunken panels, table header rows */
  --fin-surface:       #ffffff; /* cards, sheets */
  --fin-surface-muted: #f2f6f4;

  /* text */
  --fin-fg:            #14241d; /* deep green / charcoal */
  --fin-fg-muted:      #4a5b53;
  --fin-fg-subtle:     #7c8b83; /* secondary / meta */
  --fin-fg-faint:      #9fb0a7;

  /* borders */
  --fin-border:        #e4ebe7;
  --fin-border-strong: #d6e0da;

  /* brand / primary (emerald) */
  --fin-primary:       #1f8a5b;
  --fin-primary-hover: #167049;
  --fin-primary-soft:  #e6f2eb; /* tinted primary surface */

  /* status: success (emerald), warning (amber), error (rose), info (blue) */
  --fin-success-fg: #167049; --fin-success-bg: #e6f2eb; --fin-success-border: #cfe6da;
  --fin-warning-fg: #92500a; --fin-warning-bg: #fff4e2; --fin-warning-border: #f5dcb0;
  --fin-error-fg:   #be123c; --fin-error-bg:   #fce7ec; --fin-error-border:   #f6c9d4;
  --fin-info-fg:    #2563eb; --fin-info-bg:    #e8edfb; --fin-info-border:    #cdd9f7;

  /* shape & elevation */
  --fin-radius:    14px;
  --fin-radius-sm: 10px;
  --fin-shadow:    0 1px 2px rgba(20,36,29,.04), 0 6px 20px rgba(20,36,29,.05);
}
```

Conventions: expense amounts render in `--fin-error-fg`, income in
`--fin-success-fg`; both formatted as UAH with `Europe/Kyiv` dates.

---

## 4. Navigation

UA menu (single, uncrowded):

- **Огляд** → `/dashboard`
- **Журнал** → `/ledger`
- **Імпорт** → `/imports`
  - **Текст** → `/imports/text`
  - **Виписка банку** → `/imports/bank`
  - **Фото чек** → `/imports/files`
- **Рахунки** → `/accounts`
- **Налаштування** → `/settings`

(Routes per `requirements.md` lines 237–238. Note: **no** `/categories` route —
categories are free text on items.)

- **Desktop:** calm left sidebar / compact rail + topbar (title, search/quick
  action, sync/offline status).
- **Mobile / PWA:** bottom navigation for the 4–5 primary items (Огляд, Журнал,
  Імпорт, Рахунки) + a sticky primary action where the user saves/approves;
  `env(safe-area-inset-*)` support; tables collapse to card/list views.

---

## 5. Screens

Adapted from the bundled 10-screen list. **Renamed/removed items are intentional.**

1. **App Shell / Home** — brand `Finup`, short financial overview, global nav, PWA
   install/update/offline indicators, quick action "Додати операцію" / "Імпорт".
2. **Огляд / Dashboard** (`/dashboard`, FR-DASH-01..05) — balance, income, expense,
   category breakdown (by raw category text incl. `Без категорії`), trend preview,
   accounts snapshot. **Read-only.** States: connected / partial / empty / error.
3. **Журнал / Ledger list** (`/ledger`, FR-ITEM-01..02, FR-LEDGER-*) — list of
   ledger items with **status badge** (`Очікує перевірки`/`Підтверджено`/`Видалено`);
   segmented filter by status + search; row shows amount, date, account, category;
   empty state; success message after approve/delete/save; error state. *(Bundled
   ref calls this "Transactions" with pending/posted/rejected tabs — use our
   statuses and our actions instead.)*
4. **Перевірка операції / Item review-edit** (open from Журнал, FR-ITEM-03..07) —
   the key working screen. Header with amount/status/date. Editable fields: type,
   amount, account, **category (free-text input, not a picker)**, occurredAt,
   description. Items context where relevant. Lifecycle panel: **Зберегти**,
   **Підтвердити** (approve), **Видалити** (delete). Confirm block for delete.
   Read-only presentation for `deleted`. Warning if account missing before save
   (default account is auto-assigned — surface it, don't block). Link back to the
   originating raw input (traceability).
5. **Імпорт / Imports hub** (`/imports`) — pick a channel: Текст, Виписка банку,
   Фото чек. Explain the pipeline: `input → pending ledger items → review`. PDF is
   out of scope (label it).
6. **Текст / Manual text input** (`/imports/text`, FR-MAN-*) — large textarea, UA
   example placeholder (`"40 грн ковбаса, 20 грн хліб"`), CTA
   **"Розпізнати і створити операції"**, success/error messages, link to review
   the new pending items in Журнал.
7. **Виписка банку / Bank statement import** (`/imports/bank`, FR-BANK-*) — upload
   panel; provider selection **Monobank / PrivatBank / unknown**; preview table;
   importable / non-importable rows; per-row warnings; confirm import; reject
   preview; already-imported state; unsupported file state. Normalization only
   prepares clean rows — it does not categorize or write the ledger.
8. **Фото чек / Receipt photo import** (`/imports/files`, FR-FILE-*) — single-photo
   upload zone (camera/gallery/files); AI-vision parse; **OCR-not-bundled /
   unsupported** notice with fallback text textarea; success/error/unsupported
   states; privacy/sanitization hint (metadata stripped, raw preserved). **PDF is
   out of scope** — say so explicitly.
9. **Рахунки / Accounts** (`/accounts`, FR-ACCT-01..03) — default account card; list
   of accounts with per-account balance (from non-deleted items); available /
   deferred / error balance states; UAH-only visual language; editable metadata.
10. **Налаштування / Settings** (`/settings`, FR-SET-01..02) — **technical
    configuration**, including AI-provider settings. *(This replaces the bundled
    "Settings / Categories" screen. There is **no** category management UI — drop
    the create/edit/deactivate-category panels entirely.)*

---

## 6. States & messaging

One component family, four tones + confirm:

- **success** (`--fin-success-*`): операцію збережено; підтверджено; створено
  pending операції; імпорт підтверджено.
- **error** (`--fin-error-*`): помилка сервісу; парсер не впорався; не вдалося
  показати preview; помилка завантаження/БД.
- **warning** (`--fin-warning-*`): рахунок не вказано (буде призначено типовий);
  непідтримуваний OCR/файл; часткові дані на дашборді.
- **info** (`--fin-info-*`): офлайн-режим; є операції, що очікують перевірки;
  приватність/санітизація.
- **confirm**: destructive/irreversible (видалити операцію, відхилити preview
  імпорту). Inline confirm block or bottom sheet/modal; the copy states the
  consequence; buttons are primary/destructive + secondary cancel.

Example copy:

- `Очікує перевірки` · `Підтвердити операцію` · `Видалити`
- `Рахунок не вказано — буде призначено типовий рахунок.`
- `Імпорт створить операції зі статусом «очікує перевірки». Перевірте їх за потреби.`

---

## 7. PWA requirements

Installed app without browser chrome; mobile viewport height + safe areas; offline
banner; "очікує синхронізації" indicator; "доступна нова версія / оновити застосунок"
toast; file upload from camera/gallery/files; loading skeletons on slow network;
recoverable error states; **no horizontal overflow**; keyboard + screen-reader a11y.

---

## 8. Components (reference set)

`AppShell` · `Sidebar` / `MobileNav` · `Topbar` · `PageHeader` · `MetricCard` ·
`StatusBadge` (pending/approved/deleted) · `Notice`/`Banner` (4 tones) ·
`ConfirmBlock` / `BottomSheet` · `EmptyState` · `LoadingSkeleton` · `SearchInput` ·
`SegmentedFilter` · `DataTable` (desktop) + `CardList` (mobile) · `UploadDropzone` ·
`FormField` · `CategoryTextInput` (free text, **not** a category picker) ·
`Primary`/`Secondary`/`Destructive` buttons · `AmountText` (signed UAH coloring).

Promote a component to shared UI only via a Foundation/Coordination change
(TC-MOD-01/02). Until then, keep it local to the module.

---

## 9. Responsive behavior

- Tables → card/list on small screens (one row = one card, label:value pairs).
- Forms single-column on mobile; sticky primary action at the bottom on
  save/approve screens.
- Menu: sidebar on desktop, bottom nav on mobile; never hover-dependent.
- Long content scrolls vertically only — no horizontal overflow.

---

## 10. Do / Don't

**Do:** keep it calm and minimal; one accent; make confirm/error states visible;
design desktop *and* mobile/PWA; use our statuses and our approve/delete verbs;
treat category as free text.

**Don't:** build heavy enterprise banking UI; hide confirm/error states; ship
desktop-only or hover-only; copy the game theme 1:1; reintroduce posted/pending
*transactions*, confirm/reject verbs, or a category-management screen.

---

## 11. Divergences from the bundled reference

**Canonical visual file:** `docs/design/Finup Reference v2.dc.html` (model-corrected).
This is the single source of truth for layout/feel. The original old-model reference
(`Finup Reference.dc.html`, with posted/pending *transactions* and a category screen)
has been removed — do not reintroduce it. The table below records the corrections v2
already applies; keep them when reimplementing.

| Bundled reference says | Finup v1 truth |
| --- | --- |
| `pending → posted transaction` | ledger items: `pending`/`approved`/`deleted` |
| "Confirm as posted" / "Reject" | **Підтвердити** (approve) / **Видалити** (delete) |
| Screen 10 "Settings / Categories" with category CRUD | **Налаштування** = technical/AI-provider config; **no category screen** |
| Category picker / category table | Category is **free text** on the item; default `Без категорії` |
| `src/app/**`, `src/modules/**`, `src/shared/ui/**` | Our repo uses **`app/`** (no `src/`); confirm structure before pathing |
| "Transactions" nav item | **Журнал** (`/ledger`) |
| Stylistic ref from `~/Desktop/PPN_Game/...` | Inspiration only — do not copy branding/colors 1:1 |

`Finup Reference v2.dc.html` is a `dc-runtime` artifact (needs `support.js`
+ global React/ReactDOM), **not** copy-paste JSX. Use it for layout/feel; reimplement
under Next.js 16 / React 19 with the tokens in §3. **Per `AGENTS.md`, read the
relevant guide in `node_modules/next/dist/docs/` before writing Next.js code — this
version has breaking changes.**
