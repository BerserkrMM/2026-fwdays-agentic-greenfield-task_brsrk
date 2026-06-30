import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Structural enforcement of TC-STACK-04 (DB access stays behind the shared
// boundary): a "use client" component must never import the server-only db
// boundary or the raw `postgres` client.

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

function stripLeadingComments(src: string): string {
  return src
    .replace(/^\s*(?:\/\*[\s\S]*?\*\/\s*)+/, "")
    .replace(/^\s*(?:\/\/[^\n]*\n\s*)+/, "");
}

function isClientComponent(src: string): boolean {
  // "use client" must be the first non-comment statement.
  const firstLine = stripLeadingComments(src)
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return firstLine === '"use client";' || firstLine === "'use client';";
}

function importSpecifiers(src: string): string[] {
  const specs: string[] = [];
  const importLike =
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  for (const match of src.matchAll(importLike)) specs.push(match[1]);
  return specs;
}

function importsBannedDbBoundary(src: string, file: string): boolean {
  return importSpecifiers(src).some((specifier) => {
    if (specifier === "postgres") return true;
    if (specifier === "@/src/db" || specifier.startsWith("@/src/db/")) {
      return true;
    }
    if (!specifier.startsWith(".")) return false;

    const resolved = resolve(dirname(file), specifier);
    const dbRoot = resolve(ROOT, "src/db");
    return resolved === dbRoot || resolved.startsWith(`${dbRoot}/`);
  });
}

// @trace TC-STACK-04, TC-MOD-02
describe("TC-STACK-04 — DB access stays behind the shared boundary (no client-side DB access)", () => {
  it("no \"use client\" file imports the db boundary or postgres", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        if (file.endsWith(".test.ts")) continue;
        const src = readFileSync(file, "utf8");
        if (!isClientComponent(src)) continue;
        if (importsBannedDbBoundary(src, file)) {
          offenders.push(file.replace(ROOT, ""));
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
