// CSV export Route Handler (FR-SET-03). A GET handler — not a server action — is
// the idiomatic App-Router way to stream a file download and is structurally
// read-only. It serves every ledger item as a hardened CSV (formula-injection
// safe, RFC-4180 quoted) with an attachment disposition. Server-only via the
// shared DB boundary (TC-STACK-02/04); it creates, updates, and deletes nothing.

import { getRepositories } from "@/src/db/client";
import { SettingsService } from "@/src/modules/settings/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const repos = getRepositories();
  const settings = new SettingsService(repos.appConfig, repos.ledgerItems, repos.accounts);
  const csv = await settings.exportLedgerCsv();

  // BOM so spreadsheets open the Ukrainian (UTF-8) text correctly.
  const body = `﻿${csv}`;
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="finup-ledger.csv"',
      "cache-control": "no-store",
    },
  });
}
