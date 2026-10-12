import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

// pi-fff talks to the native layer through @ff-labs/fff-node and
// @ff-labs/fff-bun. Both must be pinned to one exact version: a range such as
// "*" lets a later install silently pull a different native layer than the one
// this code was tested against.
const pkgDir = path.resolve(import.meta.dir, "..");
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

describe("fff dependency pins", () => {
  const manifest = readJson(path.join(pkgDir, "package.json"));
  const deps: Record<string, string> = manifest.dependencies ?? {};

  test("fff-node and fff-bun are declared as exact versions, not ranges", () => {
    for (const name of ["@ff-labs/fff-node", "@ff-labs/fff-bun"]) {
      expect(deps[name]).toBeDefined();
      expect(deps[name]).toMatch(EXACT);
    }
  });

  test("fff-node and fff-bun share one version", () => {
    expect(deps["@ff-labs/fff-node"]).toBe(deps["@ff-labs/fff-bun"]);
  });

  test("installed fff-node and fff-bun match the declared pin", () => {
    for (const name of ["@ff-labs/fff-node", "@ff-labs/fff-bun"]) {
      const installed = readJson(
        path.join(pkgDir, "node_modules", name, "package.json"),
      ).version;
      expect(installed).toBe(deps[name]);
    }
  });
});
