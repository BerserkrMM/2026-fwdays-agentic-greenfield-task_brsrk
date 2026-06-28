# RED-run waiver — add-accounts

`add-accounts` was implemented before the durable RED/GREEN evidence checker was
introduced in PR #4 (`harden-project-factory-evidence`). The implementing agent
reported that the account tests were observed failing before implementation, but
that RED run was not saved as a machine-checkable artifact at the time.

We intentionally do **not** fabricate `red-run.json` after the fact: the tests are
now green, and any backdated non-zero exit code / git head / timestamp would be
misleading. This waiver documents the historical evidence gap only.

For slices started after PR #4, `evidence/red-run.json` is required in strict mode
and this waiver pattern should not be used as a substitute for real RED evidence.
