# Trajectory-eval waiver — add-parsing-pipeline

No runnable LLM trajectory-eval workflow is configured in this repository for a
per-slice Project Factory trajectory judgment. Deterministic trajectory checks are
run with `node scripts/check-trajectory.mjs`; maker≠checker review raw evidence is
stored under `reviews/` and summarized in `review-findings.json`.

This waiver does not replace deterministic checks or review evidence.
