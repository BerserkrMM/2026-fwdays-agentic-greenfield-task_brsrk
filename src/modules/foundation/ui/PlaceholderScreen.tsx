// PlaceholderScreen — used by routes whose capability ships later, so every nav
// target resolves to a real screen with an explicit state instead of a dead link
// or 404 (FR-IMPORT-01, FR-SHELL-03).

import { PageHeader } from "./PageHeader";
import {
  PLACEHOLDER_DEFAULT_NOTE,
  PLACEHOLDER_STATE_TITLE,
} from "./placeholder-content";
import { EmptyState } from "./states";

export function PlaceholderScreen({
  title,
  description,
  note = PLACEHOLDER_DEFAULT_NOTE,
}: {
  title: string;
  description?: string;
  note?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState title={PLACEHOLDER_STATE_TITLE} description={note} />
    </>
  );
}
