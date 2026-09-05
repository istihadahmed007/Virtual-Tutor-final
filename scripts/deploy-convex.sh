#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: Node.js/npm/npx is required." >&2
  exit 1
fi

has_deployment_config=false
if [[ -n "${CONVEX_DEPLOYMENT:-}" || -n "${CONVEX_DEPLOY_KEY:-}" ]]; then
  has_deployment_config=true
elif grep -qE '^(CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY)=' .env.local .env 2>/dev/null; then
  has_deployment_config=true
fi

if [[ "$has_deployment_config" != true ]]; then
  cat >&2 <<'EOF'
Error: no Convex deployment is configured.

Authorize first with:
  npx convex login

Then configure/select the target deployment, or provide a CI deploy key:
  export CONVEX_DEPLOYMENT=<your-production-deployment>
  # or export CONVEX_DEPLOY_KEY=<your-deploy-key>
EOF
  exit 1
fi

if [[ -z "${VITE_CONVEX_URL:-}" ]]; then
  echo "Info: VITE_CONVEX_URL is not set. Convex will inject the deployed URL into the build command." >&2
fi

echo "Deploying Convex functions from src/convex/ and building the frontend..."
npx convex deploy \
  --typecheck enable \
  --codegen enable \
  --cmd "npm run build" \
  --cmd-url-env-var-name VITE_CONVEX_URL \
  --message "Deploy Virtual Tutor backend and frontend for authentication"

echo
cat <<'EOF'
Deployment completed.

Important: this command builds dist/ with the deployed Convex URL, but your hosting provider must also have VITE_CONVEX_URL configured to the same .convex.cloud URL before its production rebuild.
EOF
