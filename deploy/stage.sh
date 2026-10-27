#!/bin/sh
# Stages a build context in deploy/build/: the four binaries, the app and the built web.
set -eu
cd "$(dirname "$0")/.."
rm -rf deploy/build && mkdir -p deploy/build/bin deploy/build/app/deploy
cp vendor/zebra/bin/zebrad vendor/lightwalletd/lightwalletd vendor/zcash-devtool/target/release/zcash-devtool "$(readlink -f ~/.bun/bin/bun)" deploy/build/bin/
cp -r server.ts package.json lib web/dist deploy/build/app/ 2>/dev/null; mkdir -p deploy/build/app/web && mv deploy/build/app/dist deploy/build/app/web/dist
cp deploy/run.sh deploy/zebrad.toml deploy/zcash.conf deploy/build/app/deploy/
cp deploy/Dockerfile deploy/compose.yaml deploy/build/
du -sh deploy/build
