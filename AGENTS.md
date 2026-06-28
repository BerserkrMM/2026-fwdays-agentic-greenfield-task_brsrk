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
