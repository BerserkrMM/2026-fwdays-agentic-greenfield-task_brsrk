// Manual text-import screen (FR-TEXT-01). Server component: it renders a
// progressively-enhanced form whose `action` is a server action, so the DB
// boundary is never pulled into a client bundle (TC-STACK-02). Validation/parse
// errors come back as `?formError=` and render inline. Ukrainian-first copy lives
// in manual-input-content.ts.

import Link from "next/link";
import { PageHeader } from "@/src/modules/foundation/ui/PageHeader";
import { ErrorState } from "@/src/modules/foundation/ui/states";
import {
  MANUAL_TEXT_PAGE,
  manualTextErrorMessage,
} from "@/src/modules/manual-input/ui/manual-input-content";
import { importTextAction } from "./actions";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ImportTextPage({
  searchParams,
}: {
  searchParams: Promise<{ formError?: string | string[] }>;
}) {
  const params = await searchParams;
  const errorMessage = manualTextErrorMessage(firstParam(params.formError));

  return (
    <>
      <PageHeader
        title={MANUAL_TEXT_PAGE.title}
        description={MANUAL_TEXT_PAGE.description}
      />

      {errorMessage ? (
        <div className="mb-6">
          <ErrorState
            title={MANUAL_TEXT_PAGE.errorTitle}
            description={errorMessage}
            action={
              <Link
                href="/imports/text"
                className="inline-flex min-h-11 items-center rounded-fin border border-fin-border bg-fin-surface px-4 text-sm font-medium text-fin-fg transition-colors hover:border-fin-border-strong"
              >
                Спробувати ще раз
              </Link>
            }
          />
        </div>
      ) : null}

      <form
        action={importTextAction}
        className="rounded-fin border border-fin-border bg-fin-surface p-5 shadow-fin"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fin-fg">
            {MANUAL_TEXT_PAGE.fieldLabel}
          </span>
          <textarea
            name="text"
            required
            rows={5}
            defaultValue=""
            placeholder={MANUAL_TEXT_PAGE.placeholder}
            className="rounded-fin border border-fin-border bg-fin-bg px-3 py-2 text-fin-fg placeholder:text-fin-fg-subtle focus:border-fin-border-strong focus:outline-none"
          />
        </label>
        <p className="mt-2 text-xs text-fin-fg-subtle">{MANUAL_TEXT_PAGE.hint}</p>
        <div className="mt-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-fin bg-fin-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-fin-primary-hover"
          >
            {MANUAL_TEXT_PAGE.submitLabel}
          </button>
        </div>
      </form>
    </>
  );
}
