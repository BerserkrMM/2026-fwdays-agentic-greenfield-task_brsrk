// Shared screen-state primitives (FR-SHELL-03). Every feature screen reuses these
// instead of rendering a blank or broken view. Ukrainian-first copy (NFR-I18N-01),
// accessible, calm fin-* styling. Presentational and framework-light (no client
// state) — the live offline detection lives in OfflineIndicator.

import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "warning" | "error";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-fin-border bg-fin-surface text-fin-fg-muted",
  info: "border-fin-info-border bg-fin-info-bg text-fin-info-fg",
  warning: "border-fin-warning-border bg-fin-warning-bg text-fin-warning-fg",
  error: "border-fin-error-border bg-fin-error-bg text-fin-error-fg",
};

interface StateViewProps {
  tone?: Tone;
  glyph: string;
  title: string;
  description?: string;
  /** Optional action (e.g. retry / navigate away). */
  action?: ReactNode;
  /** ARIA role; error/offline use "alert", others default to "status". */
  role?: "status" | "alert";
}

export function StateView({
  tone = "neutral",
  glyph,
  title,
  description,
  action,
  role = "status",
}: StateViewProps) {
  return (
    <div
      role={role}
      className={`flex flex-col items-center gap-3 rounded-fin border ${TONE_CLASSES[tone]} px-6 py-10 text-center`}
    >
      <span aria-hidden className="text-2xl leading-none">
        {glyph}
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-fin-fg">{title}</p>
        {description ? (
          <p className="text-sm text-fin-fg-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title = "Поки що порожньо",
  description = "Тут з’являться дані, коли вони будуть.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <StateView glyph="∅" title={title} description={description} action={action} />
  );
}

export function LoadingState({ title = "Завантаження…" }: { title?: string }) {
  return (
    <StateView
      glyph="◴"
      title={title}
      description="Зачекайте, будь ласка."
      role="status"
    />
  );
}

export function PartialState({
  title = "Показано частину даних",
  description = "Частину інформації не вдалося завантажити. Спробуйте оновити.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <StateView
      tone="warning"
      glyph="◐"
      title={title}
      description={description}
      action={action}
    />
  );
}

export function OfflineState({
  title = "Немає з’єднання",
  description = "Ви офлайн. Дані оновляться, коли з’єднання відновиться.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <StateView
      tone="info"
      glyph="⚡"
      title={title}
      description={description}
      role="status"
    />
  );
}

export function UnsupportedState({
  title = "Недоступно у цьому браузері",
  description = "Ваш браузер або пристрій не підтримує цю можливість.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <StateView
      tone="warning"
      glyph="⚠"
      title={title}
      description={description}
    />
  );
}

export function ErrorState({
  title = "Сталася помилка",
  description = "Не вдалося виконати дію. Спробуйте ще раз.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <StateView
      tone="error"
      glyph="✕"
      title={title}
      description={description}
      action={action}
      role="alert"
    />
  );
}
