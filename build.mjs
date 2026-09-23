import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
execFileSync("tar", ["-xzf", "site.tar.gz", "-C", "dist"], {
  stdio: "inherit"
});
