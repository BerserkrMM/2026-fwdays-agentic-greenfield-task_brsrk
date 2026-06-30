"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/src/db/client";
import {
  BankStatementError,
  assertBankProvider,
  assertSupportedBankFile,
  statementBytesToText,
} from "@/src/domain/bank-statement";
import { ParsingError } from "@/src/domain/parsing";
import { AccountsService } from "@/src/modules/accounts/service";
import { BankImportService } from "@/src/modules/bank-imports/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { ParsingService } from "@/src/modules/parsing/service";
import { configuredOpenAiAdapter } from "@/src/modules/settings/service";

function readString(formData: FormData, name: string, errorCode: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") redirect(`/imports/bank?formError=${errorCode}`);
  return value;
}

function readFile(formData: FormData): File {
  const value = formData.get("statement");
  if (!(value instanceof File) || value.size === 0) {
    redirect("/imports/bank?formError=file-invalid");
  }
  return value;
}

async function service(): Promise<BankImportService> {
  const repos = getRepositories();
  const accounts = new AccountsService(repos.accounts);
  // The OpenAI adapter is built from the stored Settings config (FR-PARSE-06),
  // falling back to OPENAI_API_KEY when none is configured.
  const parsing = new ParsingService(repos, await configuredOpenAiAdapter(repos));
  const itemCreation = new ItemCreationService(repos, accounts);
  return new BankImportService(repos, parsing, itemCreation);
}

export async function importBankAction(formData: FormData): Promise<void> {
  const providerValue = readString(formData, "provider", "provider-invalid");
  let provider;
  try {
    provider = assertBankProvider(providerValue);
  } catch {
    redirect("/imports/bank?formError=provider-invalid");
  }

  const file = readFile(formData);
  try {
    assertSupportedBankFile(file.name, file.type || null);
  } catch {
    redirect("/imports/bank?formError=file-invalid");
  }

  let summary;
  try {
    // Decoding the upload (incl. corrupt/hostile XLSX) stays inside the catch so
    // a BankStatementError becomes a friendly redirect, never an uncaught 500.
    // Read the raw bytes once; statementBytesToText detects the real format from
    // the content (XLSX/ZIP, BIFF, CSV/HTML) and decodes the text itself
    // (including Windows-1251), so we never read the file twice.
    const rawText = statementBytesToText({
      fileName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const repos = getRepositories();
    await new AccountsService(repos.accounts).ensureSeededDefault();
    const svc = await service();
    summary = await svc.importStatement({
      provider,
      fileName: file.name,
      mimeType: file.type || null,
      rawText,
    });
  } catch (error) {
    if (error instanceof BankStatementError) {
      redirect(`/imports/bank?formError=${encodeURIComponent(error.code)}`);
    }
    if (error instanceof ParsingError) {
      redirect("/imports/bank?formError=parse-failed");
    }
    throw error;
  }

  revalidatePath("/ledger");
  redirect(`/ledger?imported=${summary.created}&failed=${summary.failed}`);
}
