// Checks durable RED -> GREEN evidence for tests-first slices.
//
// Future slices should save evidence before archive:
//   openspec/changes/<slice>/evidence/red-run.json
//   openspec/changes/<slice>/evidence/green-run.json
// After archive, the same files live under openspec/changes/archive/<date-slice>/.
//
// By default this warns for historical slices. Use --strict (or --slice <name>
// for the current slice) to make missing/invalid evidence fail.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const sliceArg = valueAfter("--slice");
const failures = [];
const warnings = [];
const failOrWarn = (msg) => (strict || sliceArg ? failures.push(msg) : warnings.push(msg));

const sliceDirs = discoverSlices().filter((s) => !sliceArg || s.name === sliceArg || s.name.endsWith(`-${sliceArg}`));
if (sliceArg && sliceDirs.length === 0) failures.push(`slice "${sliceArg}" not found under openspec/changes or archive`);
if (!sliceDirs.length && !sliceArg) warnings.push("no OpenSpec slices found to check");

for (const s of sliceDirs) {
  const red = readJson(join(s.dir, "evidence/red-run.json"));
  const redWaiver = existsSync(join(s.dir, "evidence/red-run-waiver.md"));
  const green = readJson(join(s.dir, "evidence/green-run.json"));
  if (!red) {
    if (redWaiver && !strict && !sliceArg) {
      warnings.push(`${s.name}: RED evidence waived for historical slice; not valid for new strict slices`);
    } else {
      failOrWarn(`${s.name}: missing evidence/red-run.json`);
    }
  }
  if (!green) failOrWarn(`${s.name}: missing evidence/green-run.json`);
  if (red) {
    if (red.exitCode === 0) failOrWarn(`${s.name}: red-run exitCode must be non-zero`);
    if (!red.command || !red.gitHead || !red.timestamp) failOrWarn(`${s.name}: red-run must include command, gitHead, timestamp`);
    if (!Array.isArray(red.failingTests) || red.failingTests.length === 0) failOrWarn(`${s.name}: red-run must list failingTests`);
  }
  if (green) {
    if (green.exitCode !== 0) failOrWarn(`${s.name}: green-run exitCode must be 0`);
    if (!green.command || !green.gitHead || !green.timestamp) failOrWarn(`${s.name}: green-run must include command, gitHead, timestamp`);
  }
  if (red?.timestamp && green?.timestamp && Date.parse(red.timestamp) > Date.parse(green.timestamp)) {
    failOrWarn(`${s.name}: red-run timestamp is after green-run timestamp`);
  }
}

for (const w of warnings) console.warn(`WARN  [red-green] ${w}`);
for (const f of failures) console.error(`FAIL  [red-green] ${f}`);
console.log(`\nred/green evidence: ${sliceDirs.length} slice(s) checked — ${failures.length} failure(s), ${warnings.length} warning(s)`);
process.exit(failures.length ? 1 : 0);

function discoverSlices() {
  const dirs = [];
  for (const base of ["openspec/changes", "openspec/changes/archive"]) {
    const abs = join(root, base);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      if (entry === "archive") continue;
      const dir = join(abs, entry);
      if (statSync(dir).isDirectory()) dirs.push({ name: entry.replace(/^\d{4}-\d{2}-\d{2}-/, ""), dir });
    }
  }
  return dirs;
}
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
