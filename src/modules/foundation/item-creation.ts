// Item-creation contract implementation — the ONLY sanctioned ledger-item write
// path (FR-PARSE-07). Server-side only (TC-STACK-02). Creates one `pending`
// LedgerItem from a parsed draft, resolving the default account when none is
// supplied (FR-ITEM-06) and defaulting the category (FR-CAT-03).

import { DEFAULT_CATEGORY } from "@/src/domain/money";
import type { LedgerItem } from "@/src/domain/ledger-item";
import {
  type AccountsPort,
  type CreateLedgerItemInput,
  type ItemCreationContract,
  MissingInputEventError,
  NoDefaultAccountError,
  type Repositories,
} from "@/src/domain/ports";

function newId(): string {
  return globalThis.crypto.randomUUID();
}

export class ItemCreationService implements ItemCreationContract {
  constructor(
    private readonly repos: Repositories,
    private readonly accounts: AccountsPort,
  ) {}

  async createPendingItem(input: CreateLedgerItemInput): Promise<LedgerItem> {
    const { draft, inputEventId, parserRunId = null } = input;

    // Referential ordering: the input event must already exist.
    const event = await this.repos.inputEvents.findById(inputEventId);
    if (!event) throw new MissingInputEventError(inputEventId);

    // Resolve the account: explicit, else the default account (FR-ITEM-06).
    const accountId =
      input.accountId ?? (await this.accounts.getDefaultAccountId());
    if (!accountId) throw new NoDefaultAccountError();

    const item: LedgerItem = {
      id: newId(),
      accountId,
      inputEventId,
      parserRunId,
      description: draft.description,
      amountMinor: draft.amountMinor,
      currency: draft.currency,
      type: draft.type,
      category: draft.category?.trim() ? draft.category : DEFAULT_CATEGORY,
      status: "pending",
      importRowNumber: draft.sourceRef?.rowNumber ?? null,
      occurredAt: draft.occurredAt ? new Date(draft.occurredAt) : null,
      createdAt: new Date(),
    };

    return this.repos.ledgerItems.insert(item);
  }
}
