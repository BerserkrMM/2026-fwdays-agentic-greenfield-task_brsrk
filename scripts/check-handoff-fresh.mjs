// Handoff freshness checker for docs/current-state.md.
//
// This prevents agents from finishing with stale narrative state (for example,
// saying an OpenSpec change is "in progress" after it has already been archived).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const handoffPath = join(root, "docs/current-state.md");
const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);
const warn = (msg) => warnings.push(msg);

if (!existsSync(handoffPath)) fail("docs/current-state.md is missing");
const text = existsSync(handoffPath) ? readFileSync(handoffPath, "utf8") : "";
const entries = text.split(/^---\s*$/m).map((s) => s.trim()).filter((s) => /^##\s+/m.test(s));
const top = entries[0] ?? "";

for (const section of ["What was done", "Current state", "Next steps", "Open questions / blockers"]) {
  if (!new RegExp(`\\*\\*${escapeRe(section)}\\*\\*`, "i").test(top)) fail(`top current-state entry is missing "${section}"`);
}
if (!/^##\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+UTC/m.test(top)) {
  fail("top current-state entry must start with a UTC timestamp heading");
}

const archivedNames = archivedChangeNames();
for (const name of archivedNames) {
  if (new RegExp(`${escapeRe(name)}[\\s\\S]{0,240}in progress`, "i").test(top) || new RegExp(`in progress[\\s\\S]{0,240}${escapeRe(name)}`, "i").test(top)) {
    fail(`top current-state entry says archived change "${name}" is still in progress`);
  }
}

if (/\b(done|complete|completed|shipped|PR\s+#?\d+|open PR|opened PR)\b/i.test(top) && !/\b(archive|archived|PR|pull request|final state|final)\b/i.test(top)) {
  warn("top entry sounds final but does not mention archive/PR/final state explicitly");
}

const gitTs = git(["log", "-1", "--format=%ct", "--", "docs/current-state.md"]);
const headTs = git(["log", "-1", "--format=%ct"]);
if (gitTs && headTs && Number(gitTs) < Number(headTs)) {
  warn("docs/current-state.md is not touched by the latest commit; update it last for meaningful work");
}

for (const w of warnings) console.warn(`WARN  [handoff] ${w}`);
for (const f of failures) console.error(`FAIL  [handoff] ${f}`);
console.log(`\nhandoff freshness: ${failures.length} failure(s), ${warnings.length} warning(s)`);
process.exit(failures.length ? 1 : 0);

function archivedChangeNames() {
  const dir = join(root, "openspec/changes/archive");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => statSync(join(dir, entry)).isDirectory())
    .map((entry) => entry.replace(/^\d{4}-\d{2}-\d{2}-/, ""));
}
function git(args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? (r.stdout || "").trim() : "";
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
