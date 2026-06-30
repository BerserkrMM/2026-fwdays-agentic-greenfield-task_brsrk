import Link from "next/link";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { ErrorState } from "@/src/modules/foundation/ui/states";
import {
  BANK_IMPORT_PAGE,
  bankImportErrorMessage,
} from "@/src/modules/bank-imports/ui/bank-import-content";
import { importBankAction } from "./actions";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportBankPage({
  searchParams,
}: {
  searchParams: Promise<{ formError?: string | string[] }>;
}) {
  const params = await searchParams;
  const errorMessage = bankImportErrorMessage(firstParam(params.formError));

  return (
    <>
      <PageHeader
        title={BANK_IMPORT_PAGE.title}
        description={BANK_IMPORT_PAGE.description}
      />

      {errorMessage ? (
        <div className="mb-6">
          <ErrorState
            title={BANK_IMPORT_PAGE.errorTitle}
            description={errorMessage}
            action={
              <Link
                href="/imports/bank"
                className="inline-flex min-h-11 items-center rounded-fin border border-fin-border bg-fin-surface px-4 text-sm font-medium text-fin-fg transition-colors hover:border-fin-border-strong"
              >
                Спробувати ще раз
              </Link>
            }
          />
        </div>
      ) : null}

      <form
        action={importBankAction}
        className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
      >
        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-fin-fg">
              {BANK_IMPORT_PAGE.providerLabel}
            </span>
            <select
              name="provider"
              required
              defaultValue="monobank"
              className="min-h-11 rounded-fin border border-fin-border bg-fin-bg px-3 py-2 text-fin-fg focus:border-fin-border-strong focus:outline-none"
            >
              {BANK_IMPORT_PAGE.providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-fin-fg">
              {BANK_IMPORT_PAGE.fileLabel}
            </span>
            <input
              name="statement"
              type="file"
              required
              accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="min-h-11 rounded-fin border border-dashed border-fin-border bg-fin-bg px-3 py-2 text-sm text-fin-fg file:mr-3 file:rounded-fin file:border-0 file:bg-fin-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-fin-border-strong focus:outline-none"
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-fin-fg-subtle">{BANK_IMPORT_PAGE.hint}</p>

        <div className="mt-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-fin bg-fin-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-fin-primary-hover"
          >
            {BANK_IMPORT_PAGE.submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}
