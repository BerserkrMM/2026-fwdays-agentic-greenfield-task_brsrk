// About page (`/about`) — a richly designed narrative of what Finup is and how it
// was built. Server component; no DB access, no mutations, navigation only
// (FR-SHELL-03). All copy is the single source of truth in about-content.ts; this
// file is the presentational layer (calm fin-* tokens, hand-built styled diagrams,
// no client JS / chart deps).

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ABOUT,
  type PipelineStep,
} from "@/src/modules/foundation/ui/about-content";

export const metadata = {
  title: "Про Finup — продукт і процес",
  description:
    "Що таке Finup і як він побудований: керований agentic workflow зі специфікаціями, доказами і перевірками.",
};

const CARD = "rounded-fin border border-fin-border bg-fin-surface p-6 shadow-fin";

/** Small numbered eyebrow + heading used to open every major section. */
function SectionHead({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-fin-sm bg-fin-primary-soft text-sm font-semibold tabular-nums text-fin-primary">
        {index}
      </span>
      <h2 className="text-xl font-semibold tracking-tight text-fin-fg">{title}</h2>
    </div>
  );
}

/** Horizontal node→arrow→node flow that wraps gracefully on narrow screens. */
function FlowDiagram({
  steps,
  accent = false,
}: {
  steps: readonly PipelineStep[];
  accent?: boolean;
}) {
  return (
    <ol className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-stretch gap-2">
          <div
            className={[
              "flex min-h-11 flex-col justify-center rounded-fin border px-3.5 py-2 text-center",
              accent
                ? "border-fin-primary/30 bg-fin-primary-soft"
                : "border-fin-border bg-fin-surface-muted",
            ].join(" ")}
          >
            <span className="font-mono text-sm font-medium text-fin-fg">
              {step.label}
            </span>
            {step.note ? (
              <span className="mt-0.5 text-[11px] text-fin-fg-subtle">
                {step.note}
              </span>
            ) : null}
          </div>
          {i < steps.length - 1 ? (
            <span
              aria-hidden
              className="flex items-center text-fin-fg-faint"
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Left-bordered callout for a quoted invariant / formula. */
function Callout({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <figure className="rounded-fin border border-fin-border bg-fin-surface-muted p-5">
      <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wide text-fin-fg-subtle">
        {label}
      </figcaption>
      <blockquote className="border-l-2 border-fin-primary pl-4 text-base font-medium leading-relaxed text-fin-fg">
        {children}
      </blockquote>
    </figure>
  );
}

export default function AboutPage() {
  const { product, features, build, gates, reviewers, role, next, cta } = ABOUT;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mb-10 overflow-hidden rounded-fin border border-fin-border bg-fin-fg p-8 text-fin-surface shadow-fin md:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-fin-surface/60">
          {ABOUT.hero.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
          {ABOUT.hero.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-fin-surface/85 md:text-lg">
          {ABOUT.hero.lede}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fin-surface/60">
          {ABOUT.hero.tagline}
        </p>
      </section>

      {/* ── 01 · Що таке Finup ───────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHead index={product.index} title={product.title} />
        <p className="mb-5 max-w-3xl text-sm leading-relaxed text-fin-fg-muted">
          {product.summary}
        </p>

        <div className={`${CARD} mb-4`}>
          <h3 className="mb-4 text-sm font-semibold text-fin-fg">
            {product.pipelineHeading}
          </h3>
          <FlowDiagram steps={product.pipeline} accent />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={CARD}>
            <h3 className="mb-4 text-sm font-semibold text-fin-fg">
              {product.entitiesHeading}
            </h3>
            <ul className="space-y-3">
              {product.entities.map((e) => (
                <li key={e.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <code className="rounded-fin-sm bg-fin-surface-muted px-1.5 py-0.5 font-mono text-xs font-medium text-fin-primary">
                      {e.name}
                    </code>
                    <span className="text-[11px] uppercase tracking-wide text-fin-fg-subtle">
                      {e.where}
                    </span>
                  </div>
                  <p className="text-sm text-fin-fg-muted">{e.meaning}</p>
                </li>
              ))}
            </ul>
          </div>

          <Callout label={product.invariantHeading}>
            <p>{product.invariant}</p>
            <p className="mt-3 border-0 p-0 text-sm font-normal leading-relaxed text-fin-fg-muted">
              {product.invariantWhy}
            </p>
          </Callout>
        </div>
      </section>

      {/* ── 02 · Функції продукту ────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHead index={features.index} title={features.title} />
        <p className="mb-5 max-w-3xl text-sm leading-relaxed text-fin-fg-muted">
          {features.summary}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {features.cards.map((c) => (
            <div key={c.title} className={`${CARD} flex flex-col gap-2`}>
              <span aria-hidden className="text-2xl leading-none text-fin-primary">
                {c.glyph}
              </span>
              <span className="text-base font-semibold text-fin-fg">{c.title}</span>
              <span className="text-sm text-fin-fg-muted">{c.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 03 · Як будувався проєкт ─────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHead index={build.index} title={build.title} />
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-fin-fg-muted">
          {build.summary}
        </p>

        {/* Not vibe coding: a vs comparison. */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-fin border border-fin-error-border bg-fin-error-bg p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fin-error-fg">
              <span aria-hidden>✕</span>
              {build.notVibe.badLabel}
            </div>
            <p className="font-mono text-sm leading-relaxed text-fin-fg">
              {build.notVibe.bad}
            </p>
          </div>
          <div className="rounded-fin border border-fin-success-border bg-fin-success-bg p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fin-success-fg">
              <span aria-hidden>✓</span>
              {build.notVibe.goodLabel}
            </div>
            <p className="font-mono text-sm leading-relaxed text-fin-fg">
              {build.notVibe.good}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <Callout label={build.formulaHeading}>{build.formula}</Callout>
        </div>

        {/* The repeating per-feature cycle. */}
        <div className={`${CARD} mb-6`}>
          <h3 className="mb-4 text-sm font-semibold text-fin-fg">
            {build.chainHeading}
          </h3>
          <FlowDiagram steps={build.chain} />
        </div>

        {/* 3.1–3.7 process steps. */}
        <ol className="space-y-3">
          {build.steps.map((s) => (
            <li
              key={s.index}
              className={`${CARD} flex flex-col gap-2 sm:flex-row sm:gap-5`}
            >
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-fin-primary sm:w-12">
                {s.index}
              </span>
              <div>
                <h3 className="text-base font-semibold text-fin-fg">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fin-fg-muted">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Three levels of checks. */}
        <div className="mt-8">
          <h3 className="text-base font-semibold text-fin-fg">{gates.heading}</h3>
          <p className="mb-4 mt-1 max-w-3xl text-sm text-fin-fg-muted">
            {gates.intro}
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {gates.groups.map((g) => (
              <div key={g.title} className={`${CARD} flex flex-col`}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 items-center justify-center rounded-fin-sm bg-fin-primary-soft text-fin-primary"
                  >
                    {g.glyph}
                  </span>
                  <h4 className="text-sm font-semibold text-fin-fg">{g.title}</h4>
                </div>
                <p className="mb-3 text-sm text-fin-fg-muted">{g.summary}</p>
                <ul className="mt-auto space-y-1.5">
                  {g.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm text-fin-fg"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fin-primary"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Maker ≠ checker reviewers. */}
        <div className={`${CARD} mt-6`}>
          <h3 className="text-base font-semibold text-fin-fg">
            {reviewers.heading}
          </h3>
          <p className="mb-4 mt-1 text-sm text-fin-fg-muted">{reviewers.intro}</p>
          <ul className="divide-y divide-fin-border">
            {reviewers.rows.map((r) => (
              <li
                key={r.reviewer}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <span className="font-mono text-sm font-medium text-fin-primary sm:w-52 sm:shrink-0">
                  {r.reviewer}
                </span>
                <span className="text-sm text-fin-fg-muted">{r.checks}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 04 · Моя роль ────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHead index={role.index} title={role.title} />
        <div className={`${CARD} max-w-3xl`}>
          <p className="text-sm leading-relaxed text-fin-fg-muted">{role.body}</p>
        </div>
      </section>

      {/* ── 05 · Що далі ─────────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHead index={next.index} title={next.title} />
        <ul className="grid gap-3 sm:grid-cols-2">
          {next.items.map((item, i) => (
            <li
              key={item}
              className={`${CARD} flex items-start gap-3`}
            >
              <span className="font-mono text-sm font-semibold tabular-nums text-fin-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm leading-relaxed text-fin-fg">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="rounded-fin border border-fin-border bg-fin-primary-soft p-6 text-center shadow-fin md:p-8">
        <p className="text-lg font-semibold text-fin-fg">{cta.text}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href={cta.primaryHref}
            className="min-h-11 rounded-fin bg-fin-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-fin-primary-hover"
          >
            {cta.primaryLabel}
          </Link>
          <Link
            href={cta.secondaryHref}
            className="min-h-11 rounded-fin border border-fin-border-strong bg-fin-surface px-5 py-2.5 text-sm font-medium text-fin-fg transition-colors hover:bg-fin-surface-muted"
          >
            {cta.secondaryLabel}
          </Link>
        </div>
      </section>
    </>
  );
}
