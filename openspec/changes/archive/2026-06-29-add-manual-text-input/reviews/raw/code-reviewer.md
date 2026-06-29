# Code review — add-manual-text-input

## Verdict: APPROVE (minor notes only; no blockers/majors)

Fresh independent code reviewer over `git diff dev..HEAD`. Clean domain boundaries,
server-only boundary holds, partial-success semantics correct, "no user input → raw 500" holds.

### Findings
1. **Minor — swallowed per-draft error conflates systemic failures with item failures** (`service.ts:64`). Bare `catch` also absorbed `NoDefaultAccountError`/`MissingInputEventError`; latent risk of a benign "partial" banner masking a real fault. → FIXED: those two systemic errors now propagate; only genuine per-row failures are counted. Regression test added (`service.test.ts` "propagates a systemic creation error").
2. **Minor — zero-draft parse renders success-styled "Створено операцій: 0" banner** (`ledger/page.tsx` + `service.ts` + `actions.ts`). Misleading when nothing was recognized. → FIXED: `isEmptyImport` drives a distinct warning-tone "Нічого не імпортовано / Не вдалося розпізнати жодної операції…" banner; message + test added.
3. **Nit — duplicated `firstParam` helper** (`page.tsx:18-20`) vs the one in ledger-params. Reviewer notes a cross-module import "would arguably be worse". → ACCEPTED: kept local; promoting a shared foundation util is more churn than warranted for a 3-line helper.

### Verified clean
- TC-PURE-01 (domain/ui pure; service injects deps), TC-STACK-02 (no DB pulled client-side; `actions.ts` sole DB composition point), NFR-PRIV-02 (original untrimmed rawText stored), partial-success/no-rollback, memoized repos (no split-store), convention parity with `app/ledger/actions.ts`.
- Live OpenAI intentionally deferred: with no `OPENAI_API_KEY`, a real submission surfaces `parse-failed` rather than creating items (matches stated scope).
