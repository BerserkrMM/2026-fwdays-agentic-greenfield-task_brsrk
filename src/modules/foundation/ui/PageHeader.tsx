// Page header (DESIGN.md §8). Title + optional description, Ukrainian-first.

import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fin-fg">
          {title}
        </h1>
        {description !== undefined ? (
          <p className="text-sm text-fin-fg-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
