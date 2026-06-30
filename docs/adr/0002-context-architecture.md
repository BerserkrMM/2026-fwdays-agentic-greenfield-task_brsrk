# ADR-0002: Treat the static/dynamic context boundary as an architectural decision

- **Status:** Accepted
- **Date:** 2026-06-27
- **Deciders:** orchestrator + user

## Context

Agent context has a direct, recurring cost: static context (loaded on every turn)
is paid for on every interaction, while dynamic context is loaded only when a task
needs it. Without an explicit, owned boundary the static layer (`AGENTS.md`,
`CLAUDE.md`) tends to accrete per-domain detail and silently inflate per-turn cost.
This project (Finup, Next.js 16) runs under the Project Factory loop, which assumes
a lean static layer and progressive disclosure of domain detail.

## Decision

We will treat the static/dynamic context boundary as a versioned architectural
decision with a documented token budget (≤ 4k tokens for the static layer), recorded
in `docs/context-architecture.md`. Domain detail, framework API docs, and reusable
procedures live in the dynamic layer and are loaded on demand. Any change to the
boundary or budget is recorded as a new ADR.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Versioned context boundary + budget (chosen) | Bounded per-turn cost; forces progressive disclosure; auditable | Requires periodic review of static-layer size |
| Put everything an agent might need in `AGENTS.md` | Simple; nothing to look up | Per-turn cost grows unbounded; stale detail; expensive |
| No explicit policy | Zero upfront effort | Drift is invisible until cost/quality degrade |

## Consequences

- **Easier:** reasoning about per-turn cost; keeping `AGENTS.md` focused on durable rules.
- **Accepted:** the static layer must be reviewed on a cadence and content demoted when it exceeds budget.
- **Follow-ups:** measure the static layer's actual token size; demote any domain-specific rules that creep into `AGENTS.md` to skills or `openspec/specs/`.
