"use server";

// Accounts server actions (TC-STACK-02: server-only; never imported by a client
// component). Each action mutates through the AccountsService and follows the
// shared inline error-surface pattern: on a rejected action it redirects to
// `/accounts?formError=<code>` (the page renders the banner); on success it
// revalidates and returns to a clean URL. No user input produces a raw 500.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/src/db/client";
import { AccountError } from "@/src/domain/account";
import { AccountsService } from "@/src/modules/accounts/service";

function service(): AccountsService {
  return new AccountsService(getRepositories().accounts);
}

/** Runs a mutation, mapping a domain AccountError to the inline error surface. */
async function run(mutate: () => Promise<unknown>): Promise<void> {
  try {
    await mutate();
  } catch (error) {
    if (error instanceof AccountError) {
      redirect(`/accounts?formError=${encodeURIComponent(error.code)}`);
    }
    throw error;
  }
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function createAccountAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  await run(() => service().createAccount(name));
}

export async function setDefaultAccountAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await run(() => service().setDefaultAccount(id));
}

export async function renameAccountAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  await run(() => service().renameAccount(id, name));
}

export async function archiveAccountAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await run(() => service().archiveAccount(id));
}
