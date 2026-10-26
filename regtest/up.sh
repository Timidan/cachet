#!/usr/bin/env bash
# Local regtest chain: zebrad (NU6.3 Ironwood at 5, NU7 off) + lightwalletd on 127.0.0.1:9067.
# Usage: up.sh start | stop | mine [n] | height
set -euo pipefail
Z=/home/timidan/Desktop/zecathon
rpc() { curl -s -m 120 -H 'content-type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":$2}" http://127.0.0.1:18232; }
case "${1:-}" in
  start)
    nohup "$Z/vendor/zebra/bin/zebrad" -c "$Z/regtest/zebrad.toml" start > "$Z/regtest/zebrad.log" 2>&1 &
    curl -s -o /dev/null --retry 30 --retry-connrefused --retry-delay 1 -m 5 http://127.0.0.1:18232 || true
    nohup "$Z/vendor/lightwalletd/lightwalletd" --zcash-conf-path "$Z/regtest/zcash.conf" --grpc-bind-addr 127.0.0.1:9067 \
      --http-bind-addr 127.0.0.1:9068 --no-tls-very-insecure --data-dir "$Z/regtest/lwd-data" --log-file "$Z/regtest/lwd.log" > "$Z/regtest/lwd.stdout" 2>&1 &
    echo started ;;
  stop) pkill -x lightwalletd || true; pkill -x zebrad || true; echo stopped ;;
  mine) rpc generate "[${2:-1}]"; echo ;;
  height) rpc getblockcount '[]'; echo ;;
  *) echo "usage: $0 start|stop|mine [n]|height"; exit 1 ;;
esac
