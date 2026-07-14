import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const cliPath = join(process.cwd(), "node_modules", "vinext", "dist", "cli.js");
const args = process.argv.slice(2);

if (!existsSync(cliPath)) {
  console.error("Unable to find vinext. Run npm install before using this script.");
  process.exit(1);
}

const child = spawn(process.execPath, [cliPath, ...args], {
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? ".wrangler/wrangler.log",
  },
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
