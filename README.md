# Cachet

Pay anyone with a link: your ZEC stays in your treasury until they claim it and your key signs, then arrives shielded.

[Live demo](#try-it-in-60-seconds) · [Video](#) · [Evidence](#evidence) · [How it works](#how-it-works)

![Cachet on a phone: a payout link with the seal mascot offering a gold coin; a refused transparent address; and the received payment with its block, transaction id and deleted address](docs/screens/hero.png)

Hackathons, bounty programs and grant rounds pay people they barely know. Today they collect everyone's name and address in a form or a Telegram chat first, and that list outlives the payment. Cachet skips the list: the organiser creates a link, the recipient claims it with a shielded address, and the payment arrives in Zcash's Ironwood pool with the organiser's note as an encrypted memo. Cachet deletes the address as soon as the block confirms the payment.

Cachet never holds your spending key. Its server runs on the treasury's viewing key and builds each payout as a PCZT (a partially created Zcash transaction); your signer signs it where your seed is kept. Payouts carry no outgoing viewing key, so once one is sent, only the recipient can read who it paid and its memo: not Cachet, and not its audit key.

## How it works

1. **Create links.** In the dashboard, the organiser sets an amount, a message and an expiry, and gets one link per recipient. Nothing moves on-chain yet.
2. **Send the links** over email, Signal or any channel. Cachet keeps only a SHA-256 fingerprint of each link, so it can't show them again.
3. **Claim.** The recipient opens their link, pastes a unified address and presses Claim. Transparent and Sapling-only addresses are refused before any payment is built: a payment to them would be public.
4. **Approve.** Cachet builds the payout from the treasury's viewing key as a PCZT and proves it. Your signer (`signer.ts`), run where the seed is kept, prints what the payout pays, signs it with your key and hands it back. Cachet broadcasts it in the Ironwood pool, with the note as a memo encrypted to the recipient.
5. **Forget.** When the block lands, the receipt shows the transaction id and Cachet deletes the stored address. The payout was built with no outgoing viewing key and never stored in the treasury's wallet, so nothing on Cachet's side can read the address back. A link nobody opens expires, and its money never left the treasury.

## Why not a wallet gift card?

Zodl and Vizor already ship Zcash gift cards, and for a gift they are the right tool. Cachet is for paying many people out of a treasury.

| | Wallet gift cards | Cachet |
|---|---|---|
| The money moves | when you make the card | when they claim the link |
| If it's never claimed | the money waits in the card | it never leaves your treasury |
| Who can spend it | anyone holding the card's link | only your key, after a claim |
| How many at once | four cards per batch in Vizor | up to 200 links per batch |
| To receive | a wallet that redeems gift cards | any shielded address |

Sources: [Vizor release notes](https://github.com/chainapsis/vizor-wallet/releases) (v0.0.58 gift card groups, v0.0.60 four-card batch limit), [Zodl iOS changelog](https://github.com/zodl-inc/zodl-ios/blob/main/CHANGELOG.md) (gift card redemption).

## Zcash integration

| What Cachet uses | Where | What it does for the user |
|---|---|---|
| Full viewing key (`wallet init-fvk`) | [`deploy/watch-wallet.sh`](deploy/watch-wallet.sh) | The server runs on a watch-only copy of the treasury. The dashboard's audit key shows an accountant every amount paid out, not who received it, and can't spend |
| PCZTs: `pczt create --discard-ovk` + `pczt prove` | [`lib/devtool.ts`](lib/devtool.ts) | Builds and proves each payout from the treasury's Ironwood notes with the viewing key alone, and with no outgoing viewing key, so only the recipient can decrypt it |
| PCZTs: `pczt sign` | [`signer.ts`](signer.ts) | Signs with the organiser's key on the organiser's machine |
| PCZTs: `pczt send-without-storing` | [`lib/devtool.ts`](lib/devtool.ts) | Broadcasts the signed payout without recording the recipient; the wallet later sees only its own change |
| Our zcash-devtool patch | [`patches/`](patches/) | `pczt sign` skipped Ironwood spends and `pczt create` always kept the sender's outgoing viewing key. The patch calls librustzcash's existing Ironwood signer and adds `--discard-ovk` (`OvkPolicy::Discard`) |
| Encrypted memos | [`server.ts`](server.ts) `memo()` | The organiser's note travels inside the payment, readable only by the recipient |
| `zcash-devtool inspect` | [`lib/address.ts`](lib/address.ts) | Refuses transparent, Sapling-only and wrong-network addresses before anything is sent |
| `sync` + `list-tx` | [`lib/devtool.ts`](lib/devtool.ts) | Confirms delivery by block height, then the address is deleted |
| Note splitting (`shield --target-note-count 4`) | treasury setup | Lets several payouts go out back to back without waiting for change |
| Zebra 7.0.0 + lightwalletd, regtest at NU6.3 | [`regtest/`](regtest/) | The chain behind the demo, on the same rules mainnet runs today |

## Evidence

Payouts made through Cachet on regtest chains (Zebra 7.0.0, Ironwood active). The first six were signed outside Cachet, by the organiser's key:

| Transaction | Block | What it shows |
|---|---|---|
| `8b5da8d49bd4dfed088ba8a643452731fc83e0edc7863cc933c45dcd96e9c930`, `397562ebf36e9e2168b2a0e4c7b5e49a143a5dddfbef6cf4ebbf759990bcd20e` | 245, 246 | Two claims back to back, approved by `signer.ts`, the second sent once the first was mined; both addresses deleted, and the treasury's viewing key shows neither recipient |
| `0c22027329225f51fade66c6fd2dd49efa8757a2c905976f5df7a991c4786889` | 244 | The first payout with no outgoing viewing key: the recipient's wallet decrypted the memo, while the treasury's viewing key sees only the 0.0005 ZEC that left and its own change |
| `67f28f0387664d302446c2ac0775888f954d23833a9f3687818e338685b80147` | 239, live demo chain | A demo claim on the live site, built from the viewing key and approved by the demo's signer; delivered 53 s after the claim |
| `d65da8292b4d83552cacbb8e25d81a0d8b56aab892994fae3edd68063dcdffaa` | 241 | A claim through the API, approved by `signer.ts`: the signer printed the PCZT's outputs, signed, and Cachet sent it |
| `07eac1ca6e0b068c7a7191240376e9677ac3dd87e1f28b8dc7744d487447a2ab` | 240 | The first PCZT payout: built by a watch-only wallet, signed by the seed wallet, 0 transparent; the recipient's wallet decrypted the memo |
| `72e7f8083940d57014bc4e8cb14e869a9a056379d9de959a31014016b92a1ba0` | 233 | A claim through the API: 0.0002 ZEC; the recipient's wallet decrypted the memo "Thanks for judging — Zecathon" |
| `c6fc3164c01517a10fcafb751dc35c983d32ccf07b630c015fe4787659c70b49` | 219 | The first payout: 0 transparent inputs or outputs, 0 Sapling, 0 Orchard, 2 Ironwood actions; the only public number is the 0.0001 fee |
| `fa00ad39a37431136aaaaf39b4c8f61f473700c32d6d51affd4edb530778aece` | 232 | Why Cachet refuses transparent addresses: zcash-devtool paid one, and the amount and address are public |

Regtest transactions can't be looked up on a public explorer. A mainnet payout is listed here once it confirms.

Tests: `bun test lib` checks the address policy (a unified address is paid; a transparent one is refused).

## Try it in 60 seconds

On the live demo, press **Try a demo payout**, then **Testing? Use a demo address**, then **Claim payment**. The receipt says the claim is waiting for approval; on the live demo a signer plays the organiser and approves it within about a minute. The payment is a real shielded transaction on the regtest chain; the demo address belongs to a wallet Cachet runs, because nobody has a wallet on a private test chain. The receipt shows the block and transaction id when it lands.

## Privacy model and limits

- **On-chain**, a Cachet payout is an ordinary shielded transaction: the amount, the treasury and the recipient are hidden. It looks the same as paying someone directly from a shielded wallet.
- **What Cachet removes** is the list: no form or chat holds names next to addresses, and the server keeps each address only between the claim and the block.
- **What Cachet's server sees**: the address from the claim until the block, the treasury's balance and the amounts it paid (through the viewing key), and the request like any web server. Cachet itself doesn't log IP addresses; run it behind a proxy that doesn't either, or open links over Tor.
- **Links work like cash.** Whoever holds a link can claim it, so send them privately. They expire.
- **Built to forget.** Payouts carry no outgoing viewing key and aren't stored in the treasury's wallet, so after the block nothing on Cachet's side, the audit key included, can read who was paid or the memo. The organiser sees the address once, in the signer, when approving.
- **Cachet never holds your spending key.** The server can see the treasury and build payouts, but only your signer can sign them, and the signer prints each payout's outputs from the PCZT itself before signing. On the live demo, a signer process on the same server plays the organiser and approves every claim.
- **zcash-devtool is a developer tool**, not a hardened production wallet.
- The demo runs on **regtest** with NU6.3 (Ironwood) rules, the rules mainnet runs today. NU7 is active on public testnet but not yet on mainnet.

## Architecture

![An isometric machine: a treasury vault, gold coins for the links, an address reader that rejects a transparent card, a closed tube for the shielded payment, a block clock and a shredder](docs/anatomy/desktop-light.png)

The figure above is interactive on the live site (Under the hood): pick a link, choose a shielded or a transparent address, and watch the refusal, the payment and the address deletion. It is built from 180 parts; its numbers come from the server's real behaviour.

One Bun process (`server.ts`) serves the JSON API and the built web app, builds payouts as PCZTs from a watch-only wallet when the signer asks for one, and watches sent payouts confirm. It builds one payout at a time, and the next only once the last is mined, because the wallet doesn't record sent payouts and so can't know their notes are spent any earlier. `signer.ts` runs wherever the seed is kept. Links live in SQLite as SHA-256 hashes. Every wallet call goes through zcash-devtool, behind a lock because the wallet is one SQLite file. The web app (`web/`) is React with Vite; its fonts are bundled, so opening a link makes no third-party request.

## Run it yourself

```sh
# 1. Build the wallet (Rust) and the regtest chain
git clone https://github.com/zcash/zcash-devtool vendor/zcash-devtool && git -C vendor/zcash-devtool checkout 0b3436b
git -C vendor/zcash-devtool apply ../../patches/zcash-devtool-pczt.patch   # Ironwood signing, and pczt create --discard-ovk
cargo build --release --features regtest_support --manifest-path vendor/zcash-devtool/Cargo.toml
cargo install --locked zebrad@7.0.0 --root vendor/zebra
(cd vendor && git clone https://github.com/zcash/lightwalletd && cd lightwalletd && go build -o lightwalletd .)
regtest/up.sh start

# 2. Make Cachet's watch-only wallet from the treasury's seed wallet (made with `zcash-devtool wallet init`)
deploy/watch-wallet.sh wallet-regtest wallet-watch

# 3. Configure (.env is read by Bun)
#    NETWORK=regtest  WALLET_DIR=wallet-watch  LWD_SERVER=127.0.0.1:9067
#    REGTEST_RPC=http://127.0.0.1:18232  ADMIN_TOKEN=<long random string>  PUBLIC_URL=http://127.0.0.1:3000

# 4. Run the app, and the signer where the seed is kept (it asks before signing each payout)
(cd web && npm install && npm run build)
bun server.ts
SIGNER_WALLET=wallet-regtest bun signer.ts
```

For mainnet, set `NETWORK=main` and `LWD_SERVER=zecrocks`, fund the treasury's unified address, and keep the seed wallet off the server.

Built for [Zecathon 2026](https://thezecathon.com), Shielded Payments track. The research behind the positioning is in [`docs/research/`](docs/research/).
