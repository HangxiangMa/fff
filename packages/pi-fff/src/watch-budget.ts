import fs from "node:fs";
import path from "node:path";

/**
 * Returns true when `root` holds more than `limit` directories (excluding
 * `.git`), so its background watcher would register that many inotify watches.
 *
 * The walk stops as soon as the count exceeds `limit`. Each counted directory
 * is one step, so the work is bounded by `limit`, not by the size of the tree.
 * A `limit` of 0 or less disables the check.
 */
export function exceedsWatchBudget(root: string, limit: number): boolean {
  if (limit <= 0) return false;

  let dirs = 0;
  const pending = [root];
  while (pending.length > 0) {
    const dir = pending.pop() as string;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === ".git") continue;
      if (++dirs > limit) return true;
      pending.push(path.join(dir, entry.name));
    }
  }
  return false;
}
