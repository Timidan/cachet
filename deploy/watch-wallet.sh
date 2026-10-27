#!/bin/sh
# Makes the watch-only wallet Cachet runs on: the treasury's full viewing key, never its seed.
# Run it where the seed wallet lives, then give Cachet (WALLET_DIR) only the new directory.
# Usage: deploy/watch-wallet.sh <seed wallet dir> <new watch wallet dir> [lightwalletd host:port]
set -eu
D=${DEVTOOL:-vendor/zcash-devtool/target/release/zcash-devtool}
accounts=$("$D" wallet -w "$1" list-accounts)
field() { printf "%s\n" "$accounts" | sed -n "s/.*$1[: ] *\([0-9a-z]*\).*/\1/p" | head -1; }
"$D" wallet -w "$2" init-fvk --name treasury --fvk "$(field UFVK)" --birthday "$(field 'birthday height')" \
  --seed-fingerprint "$(field 'Seed fingerprint')" --hd-account-index "$(field 'Account index')" -s "${3:-127.0.0.1:9067}" >/dev/null
# init-fvk assumes default regtest upgrade heights; take the seed wallet's, which match the chain.
if grep -q '^network = "regtest"' "$1/keys.toml"; then
  heights=$(sed -n '/^\[activation_heights\]/,$p' "$1/keys.toml")
  sed -i '/^\[activation_heights\]/,$d' "$2/keys.toml"
  printf '%s\n' "$heights" >> "$2/keys.toml"
fi
echo "watch-only wallet ready in $2"
