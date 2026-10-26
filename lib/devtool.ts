// The wallet that signs Cachet's payouts: a thin wrapper over the zcash-devtool CLI.
// ponytail: one CLI call per payout behind a global lock; link librustzcash directly if throughput matters.
const BIN = process.env.DEVTOOL ?? "vendor/zcash-devtool/target/release/zcash-devtool";
const WALLET = process.env.WALLET_DIR ?? "wallet-regtest";
const IDENTITY = process.env.IDENTITY ?? `${WALLET}/key.txt`;
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

export function send(address: string, zats: number, memo: string): Promise<string> {
  return locked(async () => {
    const out = await run(["wallet", "-w", WALLET, "send", "-i", IDENTITY, "-s", SERVER, "--address", address, "--value", String(zats), "--memo", memo]);
    const txid = out.match(/^[0-9a-f]{64}$/m)?.[0];
    if (!txid) throw new Error("the wallet did not return a transaction id");
    return txid;
  });
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
