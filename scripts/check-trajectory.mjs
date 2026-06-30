// REFERENCE IMPLEMENTATION — deterministic trajectory validator.
//
// Sibling to check-traceability.mjs. Where check-traceability proves the
// REQUIREMENT chain, this proves the PROCESS each archived slice took — the
// part of "trajectory evaluation" that git/artifacts can prove, with exit
// codes (no LLM judgment):
//   - review evidence exists and is clean (review ran before archive);
//   - raw reviewer outputs are linked when review-findings.json declares them;
//   - the slice's commits carry the `Slice:` trailer;
//   - module scope: which lib/<domain>/ each slice touched (cross-slice
//     overlaps flagged for drift review);
//   - the archived change folder has design.md + tasks.md.
//
// HONESTY BOUNDARY: it does NOT verify test-first ordering or "no test was
// weakened". Those are not derivable from one-commit-per-slice history — they
// are graded by the `trajectory-eval` workflow (a fresh LLM judge reading the
// diff). This script never claims what it cannot prove.
//
// Usage:
//   node scripts/check-trajectory.mjs                 # report + exit code
//   node scripts/check-trajectory.mjs --release       # missing evidence/trailer = FAIL
//   node scripts/check-trajectory.mjs --strict-scope  # cross-slice module overlap = FAIL
//   node scripts/check-trajectory.mjs --check-fresh   # committed report must match
//
// Outputs (deterministic, ASCII, no timestamps — safe to diff in CI):
//   docs/qa/trajectory-report.md   (generated — do not hand-edit)
//   trace/trajectory.json          (machine-readable)
//
// Wire as: "check:trajectory": "node scripts/check-trajectory.mjs"
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const flags = new Set(process.argv.slice(2));
const PATHS = {
  archiveDir: "openspec/changes/archive",
  reportOut: "docs/qa/trajectory-report.md",
  jsonOut: "trace/trajectory.json",
};
// lib/<domain>/ dirs that are conventionally shared — never flagged as a
// cross-slice overlap.
const SHARED_DOMAINS = new Set(["auth", "db", "shared", "ui", "utils", "common", "email"]);

const failures = [];
const warnings = [];
const fail = (check, msg) => failures.push({ check, msg });
const warn = (check, msg) => warnings.push({ check, msg });
// A finding that is a hard FAIL only under a strictness flag, else a warning.
const gated = (on, check, msg) => (on ? fail(check, msg) : warn(check, msg));

const read = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null);
function git(args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return { ok: r.status === 0, out: (r.stdout || "").trim() };
}
const isRepo = git(["rev-parse", "--is-inside-work-tree"]).ok;
if (!isRepo) warn("git", "not a git work tree — trailer/scope checks skipped");

// ---------- discover archived slices ----------
const archiveAbs = join(root, PATHS.archiveDir);
const slices = existsSync(archiveAbs)
  ? readdirSync(archiveAbs).filter((e) => statSync(join(archiveAbs, e)).isDirectory())
  : [];

// slice -> { reviewEvidence, rawReviewEvidence, trailerCommits, libDomains[], processComplete }
const rows = [];
const domainToSlices = new Map(); // lib domain -> [slices]

for (const slice of slices) {
  const dir = join(PATHS.archiveDir, slice);
  // OpenSpec archives as `YYYY-MM-DD-add-<cap>`, but the commit trailer is the
  // bare `Slice: add-<cap>` — strip the date prefix so trailer matching works.
  const trailerName = slice.replace(/^\d{4}-\d{2}-\d{2}-/, "");

  // 1. review evidence
  let reviewEvidence = "missing";
  let rawReviewEvidence = "missing";
  const rf = read(join(dir, "review-findings.json"));
  if (rf) {
    try {
      const parsed = JSON.parse(rf);
      reviewEvidence = parsed.clean === true ? "clean" : "unclean";
      if (Array.isArray(parsed.rawEvidence)) {
        const missingRefs = parsed.rawEvidence.filter((p) => !existsSync(join(root, dir, p)));
        rawReviewEvidence = missingRefs.length === 0 && parsed.rawEvidence.length > 0 ? `${parsed.rawEvidence.length} linked` : `missing ${missingRefs.length}`;
        if (missingRefs.length) gated(flags.has("--release"), "raw-review-evidence", `${slice}: review-findings.json rawEvidence has missing file(s): ${missingRefs.join(", ")}`);
      }
    } catch {
      reviewEvidence = "unparseable";
    }
  }
  if (reviewEvidence !== "clean") {
    gated(flags.has("--release"), "review-evidence", `${slice}: review-findings.json is ${reviewEvidence} (review must have run clean before archive)`);
  }

  // 2. process completeness
  const processComplete = existsSync(join(root, dir, "design.md")) && existsSync(join(root, dir, "tasks.md"));
  if (!processComplete) gated(flags.has("--release"), "process", `${slice}: archived change is missing design.md and/or tasks.md`);

  // 3 + 4. trailer presence + module scope (git)
  let trailerCommits = 0;
  let libDomains = [];
  if (isRepo) {
    const { ok, out } = git(["log", "--all", `--grep=Slice: ${trailerName}`, "--name-only", "--pretty=format:commit %H"]);
    if (ok) {
      const files = new Set();
      for (const line of out.split("\n")) {
        if (line.startsWith("commit ")) trailerCommits = 1;
        else if (line.trim()) files.add(line.trim());
      }
      for (const f of files) {
        const m = f.match(/^lib\/([^/]+)\//);
        if (m) {
          libDomains.push(m[1]);
        }
      }
      libDomains = [...new Set(libDomains)];
      for (const d of libDomains) {
        if (!domainToSlices.has(d)) domainToSlices.set(d, []);
        domainToSlices.get(d).push(slice);
      }
    }
    if (trailerCommits === 0) gated(flags.has("--release"), "trailer", `${slice}: no commit carries a "Slice: ${trailerName}" trailer`);
  }

  rows.push({ slice, reviewEvidence, rawReviewEvidence, trailerCommits, libDomains, processComplete });
}

// cross-slice module overlap (after all slices seen)
const overlaps = [];
for (const [domain, owners] of domainToSlices) {
  const uniq = [...new Set(owners)];
  if (uniq.length > 1 && !SHARED_DOMAINS.has(domain)) {
    overlaps.push({ domain, slices: uniq });
    gated(flags.has("--strict-scope"), "in-scope", `lib/${domain}/ modified by ${uniq.length} slices (${uniq.join(", ")}) — review for scope drift`);
  }
}

if (slices.length === 0) warn("slices", "no archived slices found under openspec/changes/archive/ (nothing to audit yet)");

// ---------- outputs ----------
const ok = (b) => (b ? "yes" : "**no**");
const report = `# Trajectory Report (generated - do not hand-edit)

Generated by \`node scripts/check-trajectory.mjs\`. Audits the PROCESS each
archived slice took: review evidence, linked raw reviewer outputs, \`Slice:\`
trailers, and module scope.
It does NOT verify test-first ordering or test integrity (not derivable from
one-commit-per-slice history) — those are graded by the trajectory-eval workflow.

Scope: ${slices.length} archived slice(s).
Result: ${failures.length === 0 ? "PASS" : `FAIL (${failures.length} failure${failures.length === 1 ? "" : "s"})`}${warnings.length ? `, ${warnings.length} warning(s)` : ""}

| Slice | Review evidence | Raw review refs | Trailer commits | design+tasks | lib domains touched |
|---|---|---|---|---|---|
${rows
  .map((r) => `| ${r.slice} | ${r.reviewEvidence === "clean" ? "clean" : `**${r.reviewEvidence}**`} | ${r.rawReviewEvidence || "-"} | ${r.trailerCommits || "**0**"} | ${ok(r.processComplete)} | ${r.libDomains.join(", ") || "-"} |`)
  .join("\n")}

## Cross-slice module overlap

${overlaps.length ? overlaps.map((o) => `- \`lib/${o.domain}/\` touched by: ${o.slices.join(", ")}`).join("\n") : "None."}

## Failures

${failures.length ? failures.map((f) => `- **${f.check}**: ${f.msg}`).join("\n") : "None."}

## Warnings

${warnings.length ? warnings.map((w) => `- **${w.check}**: ${w.msg}`).join("\n") : "None."}
`;

const trajectory = {
  generatedBy: "scripts/check-trajectory.mjs",
  slices: rows,
  overlaps,
  failures,
  warnings,
};

if (flags.has("--check-fresh")) {
  const committed = read(PATHS.reportOut);
  if (committed === null) fail("freshness", `${PATHS.reportOut} does not exist — run the validator and commit it`);
  else if (committed.replace(/\r\n/g, "\n") !== report.replace(/\r\n/g, "\n")) fail("freshness", `${PATHS.reportOut} is stale — regenerate and commit`);
} else {
  mkdirSync(join(root, "trace"), { recursive: true });
  mkdirSync(join(root, "docs", "qa"), { recursive: true });
  writeFileSync(join(root, PATHS.reportOut), report);
  writeFileSync(join(root, PATHS.jsonOut), `${JSON.stringify(trajectory, null, 2)}\n`);
}

for (const w of warnings) console.warn(`WARN  [${w.check}] ${w.msg}`);
for (const f of failures) console.error(`FAIL  [${f.check}] ${f.msg}`);
console.log(`\ntrajectory: ${slices.length} slice(s) audited — ${failures.length} failure(s), ${warnings.length} warning(s)`);
if (!flags.has("--check-fresh")) console.log(`wrote ${PATHS.reportOut} and ${PATHS.jsonOut}`);
process.exit(failures.length ? 1 : 0);
