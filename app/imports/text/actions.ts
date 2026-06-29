"use server";

// Manual text-import server action (TC-STACK-02: server-only; never imported by a
// client component). It composes the shared DB boundary, parsing, and the
// item-creation contract, then follows the project's inline error-surface
// pattern: a validation/parse failure redirects back to `/imports/text` with a
// `?formError=<code>`; success redirects to `/ledger` with a created/failed
// summary (FR-TEXT-05). No user input produces a raw 500.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/src/db/client";
import { ManualTextError } from "@/src/domain/manual-text";
import { ParsingError } from "@/src/domain/parsing";
import { AccountsService } from "@/src/modules/accounts/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { ManualInputService } from "@/src/modules/manual-input/service";
import { OpenAiParserAdapter } from "@/src/modules/parsing/adapters";
import { ParsingService } from "@/src/modules/parsing/service";

function service(): ManualInputService {
  const repos = getRepositories();
  const accounts = new AccountsService(repos.accounts);
  const parsing = new ParsingService(repos, new OpenAiParserAdapter());
  const itemCreation = new ItemCreationService(repos, accounts);
  return new ManualInputService(repos, parsing, itemCreation);
}

function readTextField(formData: FormData): string {
  const textField = formData.get("text");
  if (textField !== null && typeof textField !== "string") {
    redirect("/imports/text?formError=empty-text");
  }
  return textField ?? "";
}

export async function importTextAction(formData: FormData): Promise<void> {
  const text = readTextField(formData);
  if (text.trim().length === 0) {
    redirect("/imports/text?formError=empty-text");
  }

  let summary;
  // The default account must exist before any item is saved (FR-ITEM-06); seeding
  // is idempotent and harmless if one already exists (FR-ACCT-06). It runs only
  // after boundary validation so rejected forms do not mutate account state.
  const repos = getRepositories();
  await new AccountsService(repos.accounts).ensureSeededDefault();
  try {
    summary = await service().importText(text);
  } catch (error) {
    if (error instanceof ManualTextError) {
      redirect(`/imports/text?formError=${encodeURIComponent(error.code)}`);
    }
    if (error instanceof ParsingError) {
      // The input_event and a failed parser_run are preserved for retry.
      redirect("/imports/text?formError=parse-failed");
    }
    throw error;
  }

  revalidatePath("/ledger");
  redirect(`/ledger?imported=${summary.created}&failed=${summary.failed}`);
}
