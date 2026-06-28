// Conservative claim hygiene checker.
//
// Agents may only use strong completion language when the same handoff entry is
// explicit about delivered scope, NOT delivered scope, produced evidence, and
// missing/waived evidence. This turns reporting honesty into a checkable shape.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = files.length ? files : ["docs/current-state.md"];
const failures = [];
const warnings = [];
const strong = /\b(full|fully|complete|entire|end-to-end|all done|fully shipped)\b/i;
const required = [
  /Scope (NOT|not) delivered/i,
  /Process evidence produced/i,
  /Process evidence (NOT|not) produced/i,
  /Deferred work/i,
];

for (const rel of targets) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, "utf8");
  const blocks = rel.endsWith("current-state.md")
    ? text.split(/^---\s*$/m).map((s) => s.trim()).filter((s) => /^##\s+/m.test(s)).slice(0, 1)
    : [text];
  for (const block of blocks) {
    if (!strong.test(block)) continue;
    const missing = required.filter((re) => !re.test(block)).map((re) => re.source.replace(/\\/g, ""));
    if (missing.length) {
      failures.push(`${rel}: strong completion language requires sections: Scope NOT delivered, Process evidence produced, Process evidence NOT produced, Deferred work`);
    }
    if (/FR-[A-Z0-9]+-\d+[\s\S]{0,160}\bdeferred\b/i.test(block) && !/Scope (NOT|not) delivered/i.test(block)) {
      failures.push(`${rel}: deferred FR mentioned without an explicit Scope NOT delivered section`);
    }
  }
}

for (const w of warnings) console.warn(`WARN  [claims] ${w}`);
for (const f of failures) console.error(`FAIL  [claims] ${f}`);
console.log(`\nclaim hygiene: ${failures.length} failure(s), ${warnings.length} warning(s)`);
process.exit(failures.length ? 1 : 0);
