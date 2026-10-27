#!/bin/sh
# Starts the regtest chain when the demo runs on regtest, then the app. On mainnet only the app runs.
set -eu
mkdir -p /data/app
if [ "${NETWORK:-regtest}" = "regtest" ]; then
  mkdir -p /data/zebra-state /data/lwd-data
  zebrad -c /app/deploy/zebrad.toml start > /data/zebrad.log 2>&1 &
  curl -s -o /dev/null --retry 60 --retry-connrefused --retry-delay 1 http://127.0.0.1:18232 || true
  lightwalletd --zcash-conf-path /app/deploy/zcash.conf --grpc-bind-addr 127.0.0.1:9067 --http-bind-addr 127.0.0.1:9068 \
    --no-tls-very-insecure --data-dir /data/lwd-data --log-file /data/lwd.log > /dev/null 2>&1 &
  curl -s -o /dev/null --retry 60 --retry-connrefused --retry-delay 1 http://127.0.0.1:9068/metrics || true
fi
exec bun /app/server.ts
