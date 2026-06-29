"use server";

// Ledger-items server actions (TC-STACK-02: server-only; never imported by a
// client component). Each action mutates through LedgerItemsService and follows
// the shared inline error-surface pattern: on a rejected action it redirects to
// `/ledger?formError=<code>` (the page renders the banner); on success it
// revalidates and returns to a clean URL. No user input produces a raw 500.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/src/db/client";
import { LedgerItemError } from "@/src/domain/ledger-item-edit";
import { LedgerItemsService } from "@/src/modules/ledger-items/service";

function service(): LedgerItemsService {
  const repos = getRepositories();
  return new LedgerItemsService(repos.ledgerItems, repos.accounts);
}

/** Runs a mutation, mapping a domain LedgerItemError to the inline error surface. */
async function run(mutate: () => Promise<unknown>): Promise<void> {
  try {
    await mutate();
  } catch (error) {
    if (error instanceof LedgerItemError) {
      redirect(`/ledger?formError=${encodeURIComponent(error.code)}`);
    }
    throw error;
  }
  revalidatePath("/ledger");
  redirect("/ledger");
}

export async function editItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await run(() =>
    service().editItem(id, {
      description: String(formData.get("description") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      type: String(formData.get("type") ?? "") === "income" ? "income" : "expense",
      category: String(formData.get("category") ?? ""),
      occurredAt: String(formData.get("occurredAt") ?? ""),
      accountId: String(formData.get("accountId") ?? ""),
    }),
  );
}

export async function approveItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await run(() => service().approveItem(id));
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await run(() => service().deleteItem(id));
}
