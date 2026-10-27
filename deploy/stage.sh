#!/bin/sh
# Stages a build context in deploy/build/: the four binaries, the app and the built web.
set -eu
cd "$(dirname "$0")/.."
# Only the app is rebuilt each time; SKIP_BIN keeps the binaries (an upload may still be reading them).
rm -rf deploy/build/app && mkdir -p deploy/build/bin deploy/build/app/deploy
[ "${SKIP_BIN:-}" ] || cp vendor/zebra/bin/zebrad vendor/lightwalletd/lightwalletd vendor/zcash-devtool/target/release/zcash-devtool "$(readlink -f ~/.bun/bin/bun)" deploy/build/bin/
cp -r server.ts package.json lib web/dist deploy/build/app/ 2>/dev/null; mkdir -p deploy/build/app/web && mv deploy/build/app/dist deploy/build/app/web/dist
cp deploy/run.sh deploy/zebrad.toml deploy/zcash.conf deploy/build/app/deploy/
cp deploy/Dockerfile deploy/compose.yaml deploy/build/
du -sh deploy/build
