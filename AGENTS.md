<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project docs — read before working

Before starting any task, read the project documentation in the `docs/` folder. At minimum:

- `docs/product-brief.md` — what we're building and why (product context, goals, scope).
- `docs/requirements.md` — the authoritative functional and non-functional requirements. Treat this as the source of truth; do not contradict it without flagging the conflict.
- `docs/design/` — reference design assets (HTML/JS mockups). Match the intended look and behavior.

Keep your work consistent with these documents. If a requirement is ambiguous or missing, surface it rather than guessing.

# Session log — `docs/current-state.md`

Maintain `docs/current-state.md` as a running handoff log so the next agent (or session) knows where things stand. Rules:

- **Read it first** at the start of every session to understand what was done last.
- **Update it before you finish** any meaningful task. Always include:
  - **Timestamp** of the action (date and time).
  - **What was done** — a concise summary of the changes made this session.
  - **Current state** — what works, what's in progress, what's broken.
  - **Next steps** — what should be picked up next.
  - **Open questions / blockers**, if any.
- Append new entries with the most recent at the top; keep older entries for history.
- Create the file if it does not exist.

# Project Factory evidence discipline

Do not turn process claims into prose-only assertions. For final slice/PR handoffs:

- **Do not hand-write final metrics.** Generate them with `npm run slice:report -- --slice <slice>` after archive/verification, then paste the generated block if metrics are needed.
- **Update `docs/current-state.md` last** for meaningful work, after archive/PR/verification status is known. Run `npm run check:handoff` before finishing.
- **RED/GREEN proof is an artifact, not a memory.** Future tests-first slices should save `evidence/red-run.json` and `evidence/green-run.json` under the OpenSpec change and run `npm run check:red-green -- --slice <slice> --strict` before archive.
- **Maker ≠ checker proof needs raw evidence.** Store raw reviewer outputs under `reviews/` and link them from `review-findings.json.rawEvidence`; the summary file alone is not enough for strong claims.
- **Do not claim “full”, “complete”, “entire loop”, “end-to-end”, or “all done” unless:** no owned/dependent scope is deferred; RED/GREEN evidence exists; raw review evidence exists; deterministic trajectory is green; and trajectory-eval is PASS or explicitly waived.
- Every final handoff/PR summary that uses completion language must include:
  - **Scope delivered**
  - **Scope NOT delivered**
  - **Process evidence produced**
  - **Process evidence NOT produced**
  - **Deferred work**
- Prefer precise wording: “deterministic G4 checks passed” is not the same as “entire Project Factory loop complete”. Run `npm run check:claims` before finishing.
