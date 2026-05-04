import { chmodSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gitDir = resolve(rootDir, ".git");
const hooksDir = resolve(rootDir, ".githooks");
const preCommitHook = resolve(hooksDir, "pre-commit");

if (!existsSync(gitDir) || !existsSync(preCommitHook)) {
  process.exit(0);
}

chmodSync(preCommitHook, 0o755);
execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: rootDir,
  stdio: "inherit",
});
