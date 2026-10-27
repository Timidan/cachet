export type Network = "main" | "test" | "regtest";
export type Status = "sealed" | "queued" | "sent" | "delivered" | "expired";

export type LinkView = {
  status: Status; sender: string; note: string; zats: number; network: Network;
  createdAt: number; expiresAt: number; txid: string | null; height: number | null;
  deliveredAt: number | null; error: string | null;
  demoAddress: string | null; // regtest demo only: Cachet's own test-chain wallet
};
export type Batch = {
  id: number; label: string; sender: string; note: string; zats: number; createdAt: number; expiresAt: number;
  links: { n: number; status: Status; txid: string | null; height: number | null }[];
};
export type Treasury = { network: Network; address: string; spendable: number; reserved: number };

export const PREFIX: Record<Network, string> = { main: "u1", test: "utest1", regtest: "uregtest1" };
export const FEE_ZATS = 10_000; // ZIP-317 fee for one shielded payout

export const zec = (zats: number) => (zats / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
export const short = (s: string, head = 10, tail = 6) => (s.length > head + tail + 1 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s);
export const day = (at: number) => new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

async function body(r: Response) {
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(b.error ?? `Request failed (${r.status})`), { status: r.status, body: b });
  return b;
}

export async function getLink(token: string): Promise<LinkView | null> {
  const r = await fetch(`/api/link/${token}`);
  return r.status === 404 ? null : body(r);
}

export async function claimLink(token: string, address: string): Promise<LinkView> {
  return body(await fetch(`/api/link/${token}/claim`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address }),
  }));
}

export const health = (): Promise<{ network: Network; sample: boolean }> => fetch("/api/health").then(body);
export const sampleLink = (): Promise<{ url: string }> => fetch("/api/sample", { method: "POST" }).then(body);

export async function admin<T>(path: string, key: string, init: RequestInit = {}): Promise<T> {
  return body(await fetch(`/api/admin/${path}`, {
    ...init, headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
  }));
}
