import { spawnSync } from "node:child_process";
import path from "node:path";

const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  || path.join(process.cwd(), "node_modules/.cache/ms-playwright");

const result = spawnSync(
  "npx",
  ["playwright", "install", "chromium"],
  {
    stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
    shell: true,
  }
);

if (result.status !== 0) {
  process.stderr.write("Failed to install Playwright Chromium\n");
  process.exit(result.status || 1);
}
