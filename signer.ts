// The organiser's signer: approves Cachet payouts with the treasury's spending key, which never leaves this machine.
// Cachet builds each payout from its viewing key; this prints where the payout goes, signs it and hands it back.
// Usage: bun signer.ts [--yes]
//   CACHET_URL, ADMIN_TOKEN: the Cachet to approve for; SIGNER_WALLET: the zcash-devtool wallet holding the seed,
//   SIGNER_IDENTITY: the age key that decrypts it. --yes signs without asking (the hosted demo's stand-in organiser).
const BASE = (process.env.CACHET_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const KEY = process.env.ADMIN_TOKEN ?? "";
const WALLET = process.env.SIGNER_WALLET ?? "wallet-regtest";
const IDENTITY = process.env.SIGNER_IDENTITY ?? `${WALLET}/key.txt`;
const BIN = process.env.DEVTOOL ?? "vendor/zcash-devtool/target/release/zcash-devtool";
const AUTO = process.argv.includes("--yes");

const api = (path: string, body?: unknown) =>
  fetch(`${BASE}/api/admin/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function devtool(args: string[], input: Uint8Array): Promise<Uint8Array> {
  const p = Bun.spawn([BIN, ...args], { stdin: input, stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).arrayBuffer(), new Response(p.stderr).text(), p.exited]);
  if (code !== 0) throw new Error(err.match(/Error: (.*)/)?.[1]?.trim() ?? `zcash-devtool exited with ${code}`);
  return new Uint8Array(out);
}

console.log(`Signing Cachet payouts for ${BASE}${AUTO ? " (approving automatically)" : ""}`);
for (;;) {
  const r = await api("payouts/next").catch(() => null);
  if (!r || r.status === 204 || r.status === 503) {
    await Bun.sleep(2000);
    continue;
  }
  if (!r.ok) {
    console.error(`Cachet: ${(await r.json().catch(() => ({}))).error ?? r.status}`);
    await Bun.sleep(5000);
    continue;
  }
  const { id, pczt } = (await r.json()) as { id: number; pczt: string };
  const unsigned = Buffer.from(pczt, "base64");
  // Read the payout from the PCZT itself, not from anything Cachet says about it.
  console.log(new TextDecoder().decode(await devtool(["pczt", "inspect"], unsigned)).trim());
  if (!AUTO && prompt("Sign this payout? [y/N]")?.trim().toLowerCase() !== "y") {
    console.log("Not signed. Stopping, so it isn't offered again.");
    break;
  }
  const signed = await devtool(["pczt", "-w", WALLET, "sign", "-i", IDENTITY], unsigned);
  const s = await api(`payouts/${id}`, { pczt: Buffer.from(signed).toString("base64") });
  const res = await s.json().catch(() => ({}));
  console.log(s.ok ? `Signed and sent: ${res.txid}` : `Not sent: ${res.error}`);
}
