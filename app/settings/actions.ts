"use server";

// Settings server actions (TC-STACK-02: server-only; never imported by a client
// component). They mutate AI-provider config through the SettingsService and
// follow the shared inline error-surface pattern: a validation failure redirects
// to `/settings?formError=<code>` (the page renders the banner); success
// revalidates and redirects to `/settings?saved=...`. No user input produces a
// raw 500. The stored key is never echoed back — only its configured status.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepositories } from "@/src/db/client";
import { SettingsError } from "@/src/domain/app-config";
import { SettingsService } from "@/src/modules/settings/service";

function service(): SettingsService {
  const repos = getRepositories();
  return new SettingsService(repos.appConfig, repos.ledgerItems, repos.accounts);
}

async function run(mutate: () => Promise<unknown>, savedFlag: string): Promise<void> {
  try {
    await mutate();
  } catch (error) {
    if (error instanceof SettingsError) {
      redirect(`/settings?formError=${encodeURIComponent(error.code)}`);
    }
    throw error;
  }
  revalidatePath("/settings");
  redirect(`/settings?saved=${savedFlag}`);
}

export async function saveAiProviderAction(formData: FormData): Promise<void> {
  const apiKey = String(formData.get("apiKey") ?? "");
  const model = String(formData.get("model") ?? "");
  await run(() => service().saveAiProvider({ apiKey, model }), "config");
}

export async function removeApiKeyAction(): Promise<void> {
  await run(() => service().removeOpenAiApiKey(), "removed");
}
