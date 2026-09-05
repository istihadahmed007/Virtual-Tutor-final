import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
process.chdir(root);

function loadLocalEnv(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY|VITE_CONVEX_URL)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv(".env.local");
loadLocalEnv(".env");

if (!process.env.CONVEX_DEPLOYMENT && !process.env.CONVEX_DEPLOY_KEY) {
  console.error("Error: no Convex deployment is configured.");
  console.error("Run `npx convex login`, then configure the existing project.");
  console.error("For this project, the production deployment is `determined-jellyfish-610`.");
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const command = [
  `${npx} convex deploy`,
  "--typecheck enable",
  "--codegen enable",
  `--cmd \"${npm} run build\"`,
  "--cmd-url-env-var-name VITE_CONVEX_URL",
  "--message \"Deploy Virtual Tutor backend and frontend for authentication\"",
].join(" ");

console.log("Deploying Convex functions and building the frontend...");
const result = spawnSync(command, {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(`Error starting Convex CLI: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
