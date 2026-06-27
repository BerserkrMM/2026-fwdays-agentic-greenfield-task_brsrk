import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Structural enforcement of TC-STACK-02: a "use client" component must never
// import the server-only db boundary or the raw `postgres` client.

const ROOT = join(__dirname, "..", "..");
const SCAN_DIRS = ["app", "src"].map((d) => join(ROOT, d));
const CODE_EXT = /\.(tsx?|jsx?)$/;

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (CODE_EXT.test(entry)) out.push(full);
  }
  return out;
}

function isClientComponent(src: string): boolean {
  // "use client" must be the first non-empty statement.
  const firstLine = src
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("//"));
  return firstLine === '"use client";' || firstLine === "'use client';";
}

const BANNED = [/from\s+["']postgres["']/, /from\s+["']@\/src\/db\//];

describe("TC-STACK-02 — no client-side database access", () => {
  it("no \"use client\" file imports the db boundary or postgres", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        if (file.endsWith(".test.ts")) continue;
        const src = readFileSync(file, "utf8");
        if (!isClientComponent(src)) continue;
        if (BANNED.some((re) => re.test(src))) {
          offenders.push(file.replace(ROOT, ""));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
