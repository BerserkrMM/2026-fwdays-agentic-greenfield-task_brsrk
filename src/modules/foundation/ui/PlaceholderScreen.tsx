// PlaceholderScreen — used by routes whose capability ships later, so every nav
// target resolves to a real screen with an explicit state instead of a dead link
// or 404 (FR-IMPORT-01, FR-SHELL-03).

import { PageHeader } from "./PageHeader";
import { EmptyState } from "./states";

export function PlaceholderScreen({
  title,
  description,
  note = "Цей розділ зараз у розробці й з’явиться незабаром.",
}: {
  title: string;
  description?: string;
  note?: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState title="Скоро" description={note} />
    </>
  );
}
