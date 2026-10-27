#!/bin/sh
# Redeploys the app to LuxVPS: builds the web app, uploads server + web (not the binaries), rebuilds the container.
set -eu
cd "$(dirname "$0")/.."
(cd web && npx vite build >/dev/null)
SKIP_BIN=1 deploy/stage.sh >/dev/null
tar -C deploy/build -czf - app Dockerfile compose.yaml |
  ssh -o BatchMode=yes -o ConnectTimeout=10 luxvps 'cd /home/agentops/cachet/build && rm -rf app && tar -xzf - && docker compose up -d --build 2>&1 | tail -2'
curl -s --retry 10 --retry-all-errors --retry-delay 2 -m 10 https://cachet.timidan.xyz/api/health && echo
