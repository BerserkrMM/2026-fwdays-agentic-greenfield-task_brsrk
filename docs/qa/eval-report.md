# Eval Report (manual baseline)

The quality BAR for graded behavior. Recordings illustrate these cases for humans; this report decides pass/fail. Guarded in CI by `node scripts/check-eval-ratchet.mjs` against `quality/eval-baseline.json`.

- Generated: 2026-06-28T15:36:34Z
- Cases: 2 (2 pass, 0 fail)
- Pass mark: 70/100 per case; CRITICAL rubric misses fail a case outright.
- Per-dimension score (ratcheted): {"explicit-state-clarity":94,"ua-ux-clarity":95}

| Case | Dimension | Proves | Score | Verdict | Judges |
|---|---|---|---|---|---|
| eval-foundation-imports-hub-clarity | ua-ux-clarity | FR-IMPORT-01, FR-SHELL-03, NFR-I18N-01 | 95 | pass | 1 |
| eval-foundation-placeholder-state-clarity | explicit-state-clarity | FR-SHELL-03, BC-BRAND-01, NFR-I18N-01 | 94 | pass | 1 |

## Per-case notes

### eval-foundation-imports-hub-clarity — 95/100 (pass)
Manual baseline: imports hub copy is Ukrainian-first, exposes all three channels, and clearly explains that imported data becomes pending ledger operations for later review.

### eval-foundation-placeholder-state-clarity — 94/100 (pass)
Manual baseline: placeholder screens show an explicit Ukrainian state, honestly indicate the section is in development, and avoid blank/dead-end routes.
