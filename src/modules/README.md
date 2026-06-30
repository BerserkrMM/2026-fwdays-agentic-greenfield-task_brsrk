# `src/modules/*` — business modules (TC-MOD-01)

Each capability owns a module subtree here. Rules:

- **Integrate through ports.** A module depends on other capabilities only via the
  port interfaces declared in `src/domain/ports.ts` and re-exported from this
  module's `ports.ts`. Never import another module's internals.
- **Server-side only.** Modules run on the server (server components, server
  actions, route handlers) and reach the database through the shared `src/db`
  boundary — never the `postgres` client directly, never from a client component
  (TC-STACK-02).
- **Foundation owns the shared seams.** The item-creation contract and the
  `AccountsPort` seam live in `foundation/`; later capabilities implement/consume
  them.
