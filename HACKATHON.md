# Zecathon

Source: https://thezecathon.com/ (site data file `/darkpool/data.js`, read 2026-10-26 21:42 UTC)

## G0 Enter or skip — PASS (entered 2026-10-26, user registered)
- Organiser: @zksnarks_ on X, announced 2026-09-28. Payer unconfirmed: prize split marked "proposal" in site source, judges unnamed until Oct 29, no sponsors, support is a Gmail address, payout in ZEC via Telegram.
- Judging: six unnamed judges, sealed form submissions. We have not won under form-only judging before.
- Field: NOT small. ~40 public entries on GitHub by Oct 26 (more sealed). Clusters: leak checkers ~7, sealed-bid/dark-pool/prediction ~10, games/tutorials ~10, invoicing/payroll ~5, lending vs ZEC 2, FROST escrow 3, cross-chain swaps ~5.

## G1 Rubric lock
- Deadline: **2026-10-28 23:59 UTC** (2026-10-29 00:59 WAT). Site countdown agrees. No organiser channel exists to confirm in.
- Criteria (no weights published — UNKNOWN): Privacy ("Leaks are disqualifying, not deductions"), Usefulness ("Would someone use this on Monday"), Execution ("Working beats ambitious"), Originality ("Built for this hackathon, not repackaged").
- Mandatory: exactly one track · repo URL, public by deadline · working demo URL judges can open · ~2-minute demo video URL · all code written Sep 28–Oct 28 · no existing products.
- Tracks ($15k each, +$20k grand): Shielded Payments, Private Markets ("the dark-pool thesis"), Cross-Chain, Core & Tooling, Wildcard.

## Spike: one shielded testnet tx from this machine — IN PROGRESS
- Testnet activated NU7 at 4,465,026; wallets without NU7 get rejected.
- Wallet: zcash-devtool @0b3436b (librustzcash eb38d7a has testnet NU7 at 4,465,026).
- Server: testnet.zec.rocks:443 (TLS ok). lwd*.zcash-infra.com:9067 unreachable.
- Faucet: Valar (faucet.testnet.valargroup.dev, 0.125 TAZ/day, ready). Backup: Jino (zcashfaucet.jinolabs.xyz, 0.1 TAZ z2z).
- Explorer: testnet.zecblock.com (testnet.zcashexplorer.app is on a forked chain after NU7).
- devtool supports NU7's Ironwood pool. Testnet needs `-s zecrocks` (no default testnet server). Default features are enough.
- BLOCKED 2026-10-26: auto mode refuses to build/run the cloned repo even with user approval; needs allow rules in ~/.claude/settings.json.
- Plan once unblocked: build → `wallet -w ~/Desktop/zecathon/wallet init -n test -s zecrocks` → sync → list-addresses → Valar faucet → wait 10 confs (~4 min) → `send` part of it to the faucet donation UA → check txid on zecblock.

## Ecosystem facts (Oct 26)
- Mainnet: Orchard sealed after a soundness bug; Ironwood pool live since NU6.3 (Jul 28). Mainnet NU7 not active (target ~Nov 5).
- Testnet NU7 (Oct 4, 25s blocks) broke much tooling: both faucets cannot pay (Valar fails every address type; Jino wallet down; faucet.testnet.z.cash unreachable); noir-wallet-sdk issue "all sends fail since Oct 4"; WebZjs pinned to an NU6.1 fork, last push Apr 2026 => browser-side tx building is broken ecosystem-wide.
- Prior winners: Zypherpunk (PCZT Kit, goZec, t2z, Zucchini Wallet, ZUSD, Zapp QR payments, Zchat, explorers, router SDK, bridges); ZecHub 3.0 (CYZE FROST wallet, Pendrake watch-only, ZPayroll, ZecPass sign-in SDK, ZecLedger viewing-key accounting). Shape: practical wallet-adjacent tools and missing plumbing.
- Elsewhere: Midnight Hilo (VaxZK selective disclosure; NightPool dark pool); Solana Privacy Hack (Range compliance bounty: Turbine Cash, Mixoor, Settlr Pay); Aleo (VerifyAleo, Legend of Leo, Umbra).
- Agent payments on Zcash already explored: zec-shielded-x402 + spend guard, Hanko, ZCG #445, ZAP1, zcash-mcp-server, zcash-agent-sdk.

## G2 Idea — PROVISIONAL (locks only when the mainnet spike confirms)
Payout links: an org pays people with a link instead of collecting their address. Recipient opens the link, pastes a shielded address once, the org's server pays it with a memo; the address is deleted after payout; transparent receivers are refused; unclaimed links expire and the funds stay in the treasury.
- Sponsor on hero path: the payout is a shielded Ironwood tx with memo.
- First users: Zecathon organiser (FAQ: collects winners' addresses on Telegram); ZecHub/FPF (declaration form with name + shielded address; 86 payments to 42 recipients in a 2025 snapshot).
- Honest privacy claim: on-chain identical to a direct shielded payment; removes the name<->address roster and the platform in the middle (Telegram, Google Forms). Do not oversell beyond that.
- Differs from Misthos (payroll, track sibling): payroll needs a roster; this needs nothing.
- Kill experiment: post 2-3 public claim links (Zcash forum / X); no external claim in 24h = weak signal.
- Hosting: LuxVPS container (Rust binary + sqlite wallet + age key); wallet dirs gitignored.
- Rejected: private AI credits (prompts visible to operator/LLM fails the privacy gate), inheritance vault (FROST+PCZT too heavy for 48h), WebZjs port (existing-product rule risk, Rust/WASM risk), voting (Valar's voting chain exists), POS (Zapp, CipherPay, BTCPay).

## Spike status
- Testnet wallet ok (init + sync). Faucets cannot pay => no TAZ.
- Mainnet wallet created at wallet-main (UA + transparent receiver t1eH9B5q2Uyz3CpsekBYS7w64G7s6WTbxEt). Waiting for ~0.02-0.03 ZEC. Spike = shield (if funded to t-addr) + z->z send with memo, both confirmed.

## Spike — PASS on regtest (2026-10-26 ~23:00 UTC)
Stack: zebrad 7.0.0 regtest (NU6.3 Ironwood at 5, NU7 off; config from zcash_local_net) + lightwalletd 4abfe9c + zcash-devtool 0b3436b `--features regtest_support`. Start/stop: see regtest/zebrad.toml, regtest/zcash.conf, regtest/heights.toml.
- Shield t->Ironwood: f319c8e44509212a03bf5cce53e89ffc6e862b8c89a46401b9d50799db91de14 (block 214, v6 tx).
- Payout Ironwood->Ironwood, 0.0002 + memo: c6fc3164c01517a10fcafb751dc35c983d32ccf07b630c015fe4787659c70b49 (block 219). On-chain: 0 transparent in/out, 0 Sapling, 0 Orchard, 2 Ironwood actions, valueBalance 0.0001 (fee only).
- Recipient wallet decrypted memo "Zecathon spike: payout #1" after `enhance` (compact blocks carry no memos).
Regtest gotchas: wallet birthday must be >1 (lightwalletd rejects GetTreeState at height 0); lightwalletd does not flag coinbase UTXOs, so mine 100+ blocks to another address before shielding; `pkill -f <pattern>` kills its own shell — use `pkill -x zebrad`.
Still unverified: mainnet (zec.rocks) payout received by a real Zodl wallet. Needs ~$4 at demo time.
Design checks on regtest (Oct 26 ~23:10 UTC):
- Two payouts back-to-back with no block between: both accepted (ccdfc39e…, 1eb9d452…). Shield with --target-note-count 4 gives parallel notes.
- Send without a prior sync works (d87383df…); worker still syncs on a timer for confirmations.
- devtool PAYS transparent addresses (fa00ad39…: amount + address public). App must refuse transparent receivers itself.
- Sapling-only address fails ("Insufficient balance"): devtool won't move Ironwood funds to Sapling. App asks for a unified address.
- regtest/up.sh start|stop|mine [n]|height.

## G2 Idea — LOCKED 2026-10-26 ~23:15 UTC (user: "lock it, start building")

## G3 Scope and architecture
Rubric (no weights published): Privacy (gate) · Usefulness · Execution · Originality.
Loop: org creates a batch of links (trigger) → recipient opens /c/<token>, pastes a unified address → server sends a shielded Ironwood payout with memo via zcash-devtool (sponsor call) → ZEC + memo arrive in the recipient's wallet (outcome) → claim page shows txid + "address deleted"; admin list shows paid (proof).
One deployable: Bun service (server.ts) = JSON API + static web/dist + in-process payout worker that shells out to zcash-devtool. Storage: bun:sqlite. Chain: regtest stack (dev, hosted fallback) or mainnet via zec.rocks; NETWORK is config.
Routes: GET /api/link/:token · POST /api/link/:token/claim · GET /api/admin/batches · POST /api/admin/batches · GET /api/admin/treasury.
Privacy measures: token stored as sha256; address refused unless it is a unified address with an Orchard/Ironwood receiver on the right network (devtool pays transparent addresses publicly — verified); address wiped once the payout confirms; no IP logging, no analytics.
Non-goals: FROST, ZIP-324 bearer links, accounting export, Telegram bot, dashboards beyond a status list, multi-org accounts.
G4 target: end of Oct 27 WAT — public repo, hosted URL, rough ≤90s video, form drafted.

## Prior art found during build (Oct 26 ~23:45 UTC) — trifecta research in docs/research/
- Vizor (Chainapsis/ValarDragon) ships Ironwood gift cards: groups created in one tx, links saved (v0.0.58 Sep 29; v0.0.60 four-card batch limit). Zodl iOS redeems gift cards (gift.zodl.com links + legacy ZIP-324 payment-link format). => "pay with a link" is SHIPPED in the two main wallets, as funded bearer cards.
- ZecHub runs bounties.zechub.wiki: contributors register UAs in profiles; batched shielded payouts; admin payout API private. Administrator is the Financial Privacy Foundation (not "Foundation for Public Finance").
- BTCPay core has pull payments (claim links), Zcash plugin outbound unverified.
- Cachet's remaining gap (Codex): org-controlled, treasury-held award that expires without a transfer; shielded address supplied only at claim time; any wallet.

## Positioning (decided Oct 27 ~00:45 WAT, no pivot)
"Gift cards move the money when you make them. Cachet moves it when someone opens theirs." Name Vizor + Zodl gift cards in the README's first screen as what Cachet is not ("for a gift, use your wallet; for a payout from a treasury, Cachet"). Vizor v0.0.60 caps a gift-card batch at four; an organiser paying 20 winners can't use it.
First users to name: Zecathon prizes; Shielded Labs Crosslink rewards (recurring multi-recipient ZEC). ZecHub is weaker (its platform already stores UAs).
Integration reality (Codex): no ZEC product exposes a public payout API. "Integrate" = import an approved list, return links, hand back txids.
Non-goal added: funding a Zodl/Vizor gift card at claim time — the gift.zodl.com format is unpublished, no ZIP-324 code in devtool/librustzcash, and the sweep's OVK privacy question is unanswered.

## G4 progress
- API loop verified on regtest (Oct 27 00:40 WAT): batch → claim (transparent 422, Sapling-only 422, second claim 409) → delivered in ~8s, txid 72e7f8083940d57014bc4e8cb14e869a9a056379d9de959a31014016b92a1ba0 block 233; DB address wiped; recipient memo "Thanks for judging — Zecathon".

## Design direction (Oct 27 ~01:15 WAT)
- User rejected the paper/envelope look ("no Wrenchless types of envelopes"). Homepage research (docs: scratchpad sheet of TipLink, Peanut, Zodl, CipherPay, Penumbra, Aztec, Midnight, Linear, Mercury, Phantom, Stripe): nobody uses skeuomorphic paper; strongest = dark real product UI + one striking 3D object.
- User decisions: keep the seal as a modern 3D object (gold + obsidian medallion that splits on claim); restart the anatomy figure with no envelopes (vault drum, seal-medallion carousel, card reader, opaque pneumatic tube, block dial, shredder); wants to SEE samples before choosing the art direction — Codex rendering 4 samples in docs/samples/.
- First anatomy (postal desk, 123 solids, audits 0) rejected: envelopes + too boxy. Rebuild running at Hero bar.

## Hosting plan (prepared, NOT deployed — needs user approval)
LuxVPS (Debian 11, docker, edge Caddy behind Cloudflare). deploy/: Arch-based image (glibc for our binaries), run.sh starts regtest chain + app, compose joins public_proxy. Needs: (1) new Cloudflare proxied A record cachet.timidan.xyz -> 37.114.41.229, (2) Caddy site block `cachet.timidan.xyz { import cloudflare_only; encode zstd gzip; reverse_proxy cachet:3000 }` (no X-Forwarded-For: the app never needs client IPs), (3) copy chain state + treasury wallet to /home/agentops/cachet/data.

## Decision (Oct 27 ~11:00 UTC): the server never holds the spending key
User: Cachet must not be a copy of NimDrops (Nimiq, Jul: one shared first-come link paid from an operator custody wallet; lost as a "custodial payout utility"), must use Zcash's own technology and fit the track.
- Done: the server runs on a watch-only wallet (full viewing key); payouts are PCZTs built and proven by Cachet, signed by `signer.ts` with the organiser's seed, sent by Cachet. zcash-devtool's `pczt sign` skipped Ironwood; `patches/` adds it (librustzcash already had `Signer::sign_ironwood`). Audit key (UFVK) on the dashboard. Receipt: "Claimed, waiting for <sender> to approve".
- Verified: local regtest d65da829 (block 241) and 003d62ae (242), addresses wiped; live site 67f28f03 (block 239), 53 s from claim to delivered, address wiped.
- Hosted demo: a signer process on the same box plays the organiser (disclosed in README, form, video). Wording: "never holds your spending key", not "non-custodial".
- Track fit: Shielded Payments lists payroll; pitch is private payroll for people who aren't on your payroll.
- Not doing: FROST (PCZT is what it signs; a ceremony takes days), ZSA (not on mainnet), NEAR Intents (Cross-Chain track, outside dependency), ZIP-324 bearer links (unpublished), ZIP-48 multisig (transparent).

## G4 form draft (Zecathon submit form: name, description <=2000, repo, demo, video, track)
- Project name: Cachet
- Track: Shielded Payments
- Repo: https://github.com/Timidan/cachet (PRIVATE until submission; must be public by Oct 28 23:59 UTC)
- Demo: https://cachet.timidan.xyz
- Video: TBD
- Description:
Cachet: pay anyone with a link. Your ZEC stays in your treasury until they claim it and your key signs, then arrives shielded.

Hackathons, bounty programs and grant rounds pay people they barely know, and today they collect names and addresses in forms and chats first. Cachet skips that list. An organiser creates payout links in the dashboard; each recipient opens theirs, pastes a shielded address once and presses Claim. Cachet never holds the spending key: its server runs on the treasury's full viewing key, builds the payout as a PCZT and proves it, and the organiser's signer signs it on their own machine. Cachet sends it in Zcash's Ironwood pool with the organiser's message as an encrypted memo, and deletes the address when the block confirms. Unclaimed links expire, and their money never leaves the treasury. The viewing key doubles as an audit key: an accountant can see every payout and memo, and nobody else can. Unlike wallet gift cards (Zodl, Vizor), nothing moves until a link is claimed and approved.

Why it doesn't leak: every payout is a fully shielded Ironwood transaction (0 transparent inputs or outputs; only the fee is public). Transparent, Sapling-only and wrong-network addresses are refused before any payment is built. Links are stored only as SHA-256 fingerprints. Addresses are kept only between claim and block. No analytics, no third-party requests.

Built on zcash-devtool (librustzcash) viewing-key wallets and PCZTs, with a 36-line patch adding Ironwood spends to `pczt sign`; Zebra 7.0.0 and lightwalletd.

What is real: payouts are real shielded transactions accepted by a Zebra node. What stands in: the hosted demo runs on Cachet's own regtest chain (the rules mainnet runs today), a signer process on the same server plays the organiser and approves every claim, and "Try a demo payout" pays a demo address Cachet runs, because the public testnet faucets have been down since NU7.

Evidence txids and the privacy model are in the README.
