"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/src/db/client";
import { ParsingError } from "@/src/domain/parsing";
import {
  MAX_RECEIPT_PHOTO_BYTES,
  ReceiptPhotoError,
} from "@/src/domain/receipt-photo";
import { AccountsService } from "@/src/modules/accounts/service";
import { FileImportService } from "@/src/modules/file-imports/service";
import { ItemCreationService } from "@/src/modules/foundation/item-creation";
import { OpenAiParserAdapter } from "@/src/modules/parsing/adapters";
import { ParsingService } from "@/src/modules/parsing/service";

function readFile(formData: FormData): File {
  const value = formData.get("photo");
  if (
    !(value instanceof File) ||
    value.size === 0 ||
    value.size > MAX_RECEIPT_PHOTO_BYTES
  ) {
    redirect("/imports/files?formError=file-invalid");
  }
  return value;
}

function service(): FileImportService {
  const repos = getRepositories();
  const accounts = new AccountsService(repos.accounts);
  const parsing = new ParsingService(repos, new OpenAiParserAdapter());
  const itemCreation = new ItemCreationService(repos, accounts);
  return new FileImportService(repos, parsing, itemCreation);
}

export async function importPhotoAction(formData: FormData): Promise<void> {
  const file = readFile(formData);

  let summary;
  try {
    // Reading + validating the image stays inside the catch so a ReceiptPhotoError
    // (bad/empty/non-image upload) becomes a friendly redirect, never a 500.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const repos = getRepositories();
    await new AccountsService(repos.accounts).ensureSeededDefault();
    summary = await service().importPhoto({
      fileName: file.name,
      mimeType: file.type || null,
      bytes,
    });
  } catch (error) {
    if (error instanceof ReceiptPhotoError) {
      redirect("/imports/files?formError=file-invalid");
    }
    if (error instanceof ParsingError) {
      redirect("/imports/files?formError=parse-failed");
    }
    throw error;
  }

  revalidatePath("/ledger");
  redirect(`/ledger?imported=${summary.created}&failed=${summary.failed}`);
}
