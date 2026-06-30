# `src/domain` — framework-free contracts (TC-PURE-01, TC-MOD-02)

This layer holds the **framework-free** domain model and the contracts business
modules integrate through. Rules:

- **No framework or infrastructure imports.** Files here MUST NOT import Next.js,
  React, `postgres`, or anything from `src/db`. They are plain TypeScript.
- **Shared types are owned here.** `LedgerItem`, `InputEvent`, `ParserRun`,
  `ParsedLedgerItemDraft`, and the repository / port interfaces live here.
- **Ports, not internals.** Business modules in `src/modules/*` depend on the
  port interfaces declared here (and re-exported via `src/modules/*/ports.ts`),
  never on another module's implementation.

Changing these shared contracts is a Foundation / Coordination change (TC-MOD-02).
