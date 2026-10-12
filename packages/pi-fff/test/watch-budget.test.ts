import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { exceedsWatchBudget } from "../src/watch-budget";

describe("exceedsWatchBudget", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-fff-budget-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  // Creates `count` directories nested under `base`, one per level, so the
  // walk has to descend rather than only read the top level.
  function makeDirs(base: string, count: number): void {
    let dir = base;
    for (let i = 0; i < count; i++) {
      dir = path.join(dir, `d${i}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  test("is under the budget when the directory count is at or below the limit", () => {
    makeDirs(root, 5);
    expect(exceedsWatchBudget(root, 5)).toBe(false);
    expect(exceedsWatchBudget(root, 100)).toBe(false);
  });

  test("is over the budget once the directory count exceeds the limit", () => {
    makeDirs(root, 6);
    expect(exceedsWatchBudget(root, 5)).toBe(true);
  });

  test("a limit of zero or less disables the check", () => {
    makeDirs(root, 10);
    expect(exceedsWatchBudget(root, 0)).toBe(false);
    expect(exceedsWatchBudget(root, -1)).toBe(false);
  });

  test("does not count .git directories", () => {
    makeDirs(root, 3);
    fs.mkdirSync(path.join(root, ".git", "objects", "ab"), { recursive: true });
    fs.mkdirSync(path.join(root, ".git", "refs", "heads"), { recursive: true });

    // 3 real directories; the .git tree is skipped entirely.
    expect(exceedsWatchBudget(root, 3)).toBe(false);
    expect(exceedsWatchBudget(root, 2)).toBe(true);
  });

  test("ignores files and counts only directories", () => {
    makeDirs(root, 2);
    for (let i = 0; i < 50; i++) fs.writeFileSync(path.join(root, `f${i}.txt`), "x");

    expect(exceedsWatchBudget(root, 2)).toBe(false);
  });

  test("a missing root is treated as within budget", () => {
    expect(exceedsWatchBudget(path.join(root, "does-not-exist"), 5)).toBe(false);
  });
});

describe("exceedsWatchBudget limit independence", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-fff-budget-large-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("a large but in-budget tree is not reported as over budget", () => {
    // 300 directories, well above what a fixed read cap would have allowed.
    // A limit of 1000 must still report it as within budget.
    for (let i = 0; i < 300; i++) fs.mkdirSync(path.join(root, `d${i}`));

    expect(exceedsWatchBudget(root, 1000)).toBe(false);
    expect(exceedsWatchBudget(root, 299)).toBe(true);
  });
});
