import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getRepositories,
  getSql,
  isPostgresConfigured,
  resetDbBoundaryForTests,
} from "./client";

const original = process.env.DATABASE_URL;

beforeEach(async () => {
  await resetDbBoundaryForTests();
  delete process.env.DATABASE_URL;
});

afterEach(async () => {
  await resetDbBoundaryForTests();
  if (original === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = original;
});

// @trace TC-DATA-01, TC-STACK-04
describe("db boundary fallback selection (TC-DATA-01)", () => {
  it("uses the in-memory fallback when DATABASE_URL is unset", () => {
    expect(isPostgresConfigured()).toBe(false);
    expect(getSql()).toBeNull();
    const repos = getRepositories();
    expect(repos.inputEvents).toBeDefined();
    expect(repos.parserRuns).toBeDefined();
    expect(repos.ledgerItems).toBeDefined();
  });

  it("the in-memory repositories round-trip an input event", async () => {
    const repos = getRepositories();
    const created = await repos.inputEvents.create({
      source: "text",
      provider: null,
      rawText: "тест",
      storageUri: null,
      mimeType: null,
    });
    expect(created.id).toBeTruthy();
    expect(await repos.inputEvents.findById(created.id)).toEqual(created);
  });
});
