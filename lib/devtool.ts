// Cachet's view of the treasury: a watch-only wallet (a full viewing key, no spending key) behind the zcash-devtool CLI.
// It builds and proves payouts as PCZTs; the organiser's signer (signer.ts) signs them; this sends them.
// ponytail: one CLI call per payout behind a global lock; link librustzcash directly if throughput matters.
const BIN = process.env.DEVTOOL ?? "vendor/zcash-devtool/target/release/zcash-devtool";
const WALLET = process.env.WALLET_DIR ?? "wallet-watch";
const SERVER = process.env.LWD_SERVER ?? "127.0.0.1:9067";

export type AddressInfo = { network: string; kind: string; receivers: string[] };

// The wallet is one sqlite file: never run two commands against it at once.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

async function run(args: string[]): Promise<string> {
  const p = Bun.spawn([BIN, ...args], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  const text = `${out}\n${err}`;
  if (code !== 0) throw new Error(text.match(/Error: (.*)/)?.[1]?.trim() ?? `zcash-devtool exited with ${code}`);
  return text;
}

export function parseInspect(text: string): AddressInfo | null {
  if (!text.trimStart().startsWith("Zcash address")) return null;
  const network = text.match(/Network: (\S+)/)?.[1];
  const kind = text.match(/Kind: (.+)/)?.[1]?.trim();
  if (!network || !kind) return null;
  const receivers = [...text.matchAll(/^\s+- (Orchard|Sapling|Transparent \S+) \(/gm)].map((m) => m[1]);
  return { network, kind, receivers };
}

export async function inspect(address: string): Promise<AddressInfo | null> {
  return parseInspect(await run(["inspect", address]).catch(() => ""));
}

// PCZTs are binary, so they go through stdin and stdout.
async function pipe(args: string[], input?: Uint8Array): Promise<Uint8Array> {
  const p = Bun.spawn([BIN, ...args], { stdin: input ?? "ignore", stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).arrayBuffer(), new Response(p.stderr).text(), p.exited]);
  if (code !== 0) throw new Error(err.match(/Error: (.*)/)?.[1]?.trim() ?? `zcash-devtool exited with ${code}`);
  return new Uint8Array(out);
}

// A payout ready for the organiser to sign: built and proven from the viewing key alone, with no outgoing
// viewing key, so once it's sent only the recipient can decrypt who it paid and its memo.
export async function build(address: string, zats: number, memo: string): Promise<Uint8Array> {
  const pczt = await locked(() =>
    pipe(["pczt", "-w", WALLET, "create", "--discard-ovk", "--address", address, "--value", String(zats), "--memo", memo]),
  );
  return pipe(["pczt", "prove"], pczt);
}

// Sends a signed payout without recording it, so the wallet never holds the recipient's address.
// The wallet learns of it from the chain once it's mined, and sees only its own change.
export function broadcast(pczt: Uint8Array): Promise<string> {
  return locked(async () => {
    const out = new TextDecoder().decode(await pipe(["pczt", "-w", WALLET, "send-without-storing", "-s", SERVER], pczt));
    const txid = out.match(/^[0-9a-f]{64}$/m)?.[0];
    if (!txid) throw new Error("the wallet did not return a transaction id");
    return txid;
  });
}

// The treasury's full viewing key: it shows every payout and memo to whoever holds it, and can't spend.
let ufvk = "";
export async function auditKey(): Promise<string> {
  ufvk ||= (await locked(() => run(["wallet", "-w", WALLET, "list-accounts"]))).match(/UFVK: (\S+)/)?.[1] ?? "";
  return ufvk;
}

export const sync = () => locked(() => run(["wallet", "-w", WALLET, "sync", "-s", SERVER]));

// txid → block height, for this wallet's mined transactions (needs a recent sync).
export async function minedHeights(): Promise<Map<string, number>> {
  const out = await locked(() => run(["wallet", "-w", WALLET, "list-tx"]));
  return new Map([...out.matchAll(/^([0-9a-f]{64})\n\s+Mined: (\d+)/gm)].map((m) => [m[1], Number(m[2])]));
}

export async function treasury(): Promise<{ address: string; spendable: number }> {
  const [addrs, bal] = await locked(async () => [
    await run(["wallet", "-w", WALLET, "list-addresses"]),
    await run(["wallet", "-w", WALLET, "balance"]),
  ]);
  const flat = bal.replace(/\s+/g, "");
  const spendable = ["sapling", "orchard", "ironwood"].reduce(
    (sum, pool) => sum + Number(flat.match(new RegExp(`${pool}_balance:Balance\\{spendable_value:Zatoshis\\((\\d+)`))?.[1] ?? 0),
    0,
  );
  return { address: addrs.match(/Default Address: (\S+)/)?.[1] ?? "", spendable };
}

// Regtest only: there are no miners, so the demo mines its own block.
export async function mine(blocks = 1): Promise<void> {
  const rpc = process.env.REGTEST_RPC;
  if (!rpc) return;
  await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "generate", params: [blocks] }),
  });
}
