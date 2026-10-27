// Cachet: pay anyone with a link. One Bun process: the JSON API, the built web app and the worker that watches
// payouts confirm. It holds only the treasury's viewing key: the organiser's signer (signer.ts) signs every payout.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import * as wallet from "./lib/devtool";
import { looksLikeAddress, refusal, NETWORKS, type Network } from "./lib/address";

const NETWORK = (process.env.NETWORK ?? "regtest") as Network;
if (!(NETWORK in NETWORKS)) throw new Error(`NETWORK must be one of ${Object.keys(NETWORKS).join(", ")}`);
const DATA_DIR = process.env.DATA_DIR ?? "data";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const PUBLIC_URL = (process.env.PUBLIC_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const PUBLIC_DIR = resolve(import.meta.dir, "web/dist");
const TICK_MS = Number(process.env.TICK_MS ?? 4_000);
// Regtest demo only: a wallet Cachet runs on the test chain, so judges can open a sample link without one.
const DEMO_RECIPIENT = NETWORK === "regtest" ? (process.env.DEMO_RECIPIENT ?? "") : "";
const DEMO_CAP = 1_000; // sample links in total, so the demo can't drain the regtest treasury
const MIN_ZATS = 5_000; // ZIP-317 marginal fee: a smaller note costs the recipient more to spend than it holds
const MEMO_BYTES = 512;

mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(`${DATA_DIR}/cachet.sqlite`, { create: true });
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY, label TEXT NOT NULL, sender TEXT NOT NULL, note TEXT NOT NULL,
  zats INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY, batch_id INTEGER NOT NULL REFERENCES batches(id),
  token_hash TEXT NOT NULL UNIQUE,         -- the link itself is never stored
  status TEXT NOT NULL DEFAULT 'sealed',   -- sealed → queued (claimed, awaiting the organiser's signature) → sent → delivered, or expired
  address TEXT,                            -- held only from claim until the payout is mined
  txid TEXT, height INTEGER, error TEXT, claimed_at INTEGER, sent_at INTEGER, delivered_at INTEGER);
`);

type Link = {
  id: number; status: string; txid: string | null; height: number | null; error: string | null;
  delivered_at: number | null; sender: string; note: string; zats: number; created_at: number; expires_at: number;
};
const linkByToken = db.query<Link, [string]>(
  `SELECT links.id, status, txid, height, error, delivered_at, sender, note, zats, created_at, expires_at
   FROM links JOIN batches ON batches.id = links.batch_id WHERE token_hash = ?`,
);

// Read back from SQLite itself: bun:sqlite's run() only returns these from Bun 1.1.14 on.
const changes = () => db.query<{ n: number }, []>("SELECT changes() AS n").get()!.n;
const lastId = () => db.query<{ id: number }, []>("SELECT last_insert_rowid() AS id").get()!.id;

const hash = (token: string) => new Bun.CryptoHasher("sha256").update(token).digest("hex");
const newToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
const memo = (sender: string, note: string) => (note ? `${note} — ${sender}` : `From ${sender}`);
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const expired = (status: string, expiresAt: number) => status === "sealed" && Date.now() > expiresAt;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const HEADERS = { "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...HEADERS, "cache-control": "no-store" } });
const fail = (status: number, error: string) => json({ error }, status);

function view(l: Link) {
  const status = expired(l.status, l.expires_at) ? "expired" : l.status;
  return {
    status, sender: l.sender, note: l.note, zats: l.zats, network: NETWORK, createdAt: l.created_at, expiresAt: l.expires_at,
    txid: l.txid, height: l.height, deliveredAt: l.delivered_at, error: status === "sealed" ? l.error : null,
    demoAddress: DEMO_RECIPIENT || null,
  };
}

// One demo payout link for a visitor, from a standing "Demo payouts" batch.
function sampleLink() {
  if (!DEMO_RECIPIENT) return fail(404, "Not found.");
  const label = "Demo payouts";
  let batch = db.query<{ id: number }, [string]>("SELECT id FROM batches WHERE label = ?").get(label);
  if (!batch) {
    db.run(
      "INSERT INTO batches (label, sender, note, zats, created_at, expires_at) VALUES (?, 'Cachet', 'A demo payout on the test network', 20000, ?, ?)",
      [label, Date.now(), Date.now() + 365 * 86_400_000],
    );
    batch = { id: lastId() };
  }
  const made = db.query<{ n: number }, [number]>("SELECT COUNT(*) AS n FROM links WHERE batch_id = ?").get(batch.id)!.n;
  if (made >= DEMO_CAP) return fail(429, "The demo payouts have all been claimed.");
  const token = newToken();
  db.run("INSERT INTO links (batch_id, token_hash) VALUES (?, ?)", [batch.id, hash(token)]);
  return json({ url: `/c/${token}` }, 201);
}

async function claim(token: string, req: Request) {
  const link = linkByToken.get(hash(token));
  if (!link) return fail(404, "This link doesn't exist.");
  if (view(link).status !== "sealed") return json(view(link), 409);
  const body = await req.json().catch(() => ({}));
  const address = str(body?.address, 2000);
  const why = looksLikeAddress(address) ? refusal(await wallet.inspect(address), NETWORK) : "That isn't a Zcash address.";
  if (why) return fail(422, why);
  db.run(
    "UPDATE links SET status = 'queued', address = ?, claimed_at = ?, error = NULL WHERE id = ? AND status = 'sealed'",
    [address, Date.now(), link.id],
  );
  if (!changes()) return fail(409, "This link was just claimed by someone else.");
  return json(view(linkByToken.get(hash(token))!));
}

function admin(req: Request) {
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(ADMIN_TOKEN);
  return ADMIN_TOKEN !== "" && got.length === want.length && timingSafeEqual(got, want);
}

async function createBatch(req: Request) {
  const b = await req.json().catch(() => null);
  const label = str(b?.label, 80), sender = str(b?.sender, 60), note = str(b?.note, 200);
  const zats = Math.round(Number(b?.zats)), count = Math.round(Number(b?.count)), days = Math.round(Number(b?.days ?? 14));
  if (!label || !sender) return fail(400, "Give the batch a name and a sender.");
  if (!(zats >= MIN_ZATS)) return fail(400, `Each link needs at least ${MIN_ZATS} zatoshis (0.00005 ZEC).`);
  if (!(count >= 1 && count <= 200)) return fail(400, "Make between 1 and 200 links at a time.");
  if (!(days >= 1 && days <= 90)) return fail(400, "Links can last between 1 and 90 days.");
  if (Buffer.byteLength(memo(sender, note)) > MEMO_BYTES) return fail(400, "The note is too long for a Zcash memo.");
  const now = Date.now();
  const tokens = Array.from({ length: count }, newToken);
  const id = db.transaction(() => {
    db.run(
      "INSERT INTO batches (label, sender, note, zats, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      [label, sender, note, zats, now, now + days * 86_400_000],
    );
    const batchId = lastId();
    for (const t of tokens) db.run("INSERT INTO links (batch_id, token_hash) VALUES (?, ?)", [batchId, hash(t)]);
    return batchId;
  })();
  // The only time these links exist outside the recipients' hands.
  return json({ id, links: tokens.map((t) => `${PUBLIC_URL}/c/${t}`) }, 201);
}

function batches() {
  type Batch = { id: number; label: string; sender: string; note: string; zats: number; created_at: number; expires_at: number };
  type Row = { status: string; txid: string | null; height: number | null; claimed_at: number | null; delivered_at: number | null };
  const links = db.query<Row, [number]>(
    "SELECT status, txid, height, claimed_at, delivered_at FROM links WHERE batch_id = ? ORDER BY id",
  );
  return db.query<Batch, []>("SELECT * FROM batches ORDER BY id DESC").all().map((b) => ({
    id: b.id, label: b.label, sender: b.sender, note: b.note, zats: b.zats, createdAt: b.created_at, expiresAt: b.expires_at,
    links: links.all(b.id).map((l, i) => ({
      n: i + 1, status: expired(l.status, b.expires_at) ? "expired" : l.status,
      txid: l.txid, height: l.height, claimedAt: l.claimed_at, deliveredAt: l.delivered_at,
    })),
  }));
}

async function treasury() {
  const reserved = db.query<{ z: number }, [number]>(
    `SELECT COALESCE(SUM(zats), 0) AS z FROM links JOIN batches ON batches.id = links.batch_id
     WHERE status IN ('sealed', 'queued') AND expires_at > ?`,
  ).get(Date.now())!.z;
  const awaiting = db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM links WHERE status = 'queued'").get()!.n;
  return { network: NETWORK, ...(await wallet.treasury()), reserved, awaiting, auditKey: await wallet.auditKey() };
}

// Release a claim that can't be paid, so the recipient can try again, and forget the address meanwhile.
const release = (id: number, why: string) =>
  db.run("UPDATE links SET status = 'sealed', address = NULL, error = ? WHERE id = ?", [why, id]);

// The payout the signer is signing. One at a time, and only once the last one is mined: the wallet doesn't record
// sent payouts, so until then it doesn't know their notes are spent. Built when the signer asks, so it can't expire waiting.
// ponytail: one payout per block; build several outputs into one PCZT if a batch needs to go out faster.
let pending: { id: number; pczt: Uint8Array; at: number } | null = null;
type Queued = { id: number; address: string; zats: number; sender: string; note: string; claimed_at: number };
const nextQueued = db.query<Queued, []>(
  `SELECT links.id, address, zats, sender, note, claimed_at FROM links JOIN batches ON batches.id = links.batch_id
   WHERE status = 'queued' ORDER BY claimed_at LIMIT 1`,
);

async function nextPayout() {
  if (pending && Date.now() - pending.at > 10 * 60_000) pending = null; // the signer went away
  if (!pending && db.query("SELECT 1 FROM links WHERE status = 'sent'").get()) {
    return fail(503, "The last payout is still confirming. Try again in a moment.");
  }
  if (!pending) {
    const l = nextQueued.get();
    if (!l) return new Response(null, { status: 204, headers: HEADERS });
    try {
      pending = { id: l.id, pczt: await wallet.build(l.address, l.zats, memo(l.sender, l.note)), at: Date.now() };
    } catch (e) {
      // Change from the last payout is still confirming: ask again shortly.
      if (/Insufficient balance/i.test(errorText(e)) && Date.now() - l.claimed_at < 10 * 60_000) {
        await wallet.mine(); // regtest only: stand-in for the next block
        return fail(503, "The treasury's change is still confirming. Try again in a moment.");
      }
      release(l.id, errorText(e));
      return fail(500, errorText(e));
    }
  }
  return json({ id: pending.id, pczt: Buffer.from(pending.pczt).toString("base64") });
}

async function submitPayout(id: number, req: Request) {
  if (pending?.id !== id) return fail(409, "That payout isn't waiting for a signature.");
  const b = await req.json().catch(() => null);
  const signed = typeof b?.pczt === "string" ? Buffer.from(b.pczt, "base64") : null;
  if (!signed?.length) return fail(400, "Send the signed payout.");
  pending = null;
  try {
    const txid = await wallet.broadcast(signed);
    db.run("UPDATE links SET status = 'sent', txid = ?, sent_at = ? WHERE id = ?", [txid, Date.now(), id]);
    return json({ txid });
  } catch (e) {
    release(id, errorText(e));
    return fail(502, errorText(e));
  }
}

// The worker: watch sent payouts until they're mined, then forget the address.
let ticking = false;
let lastSync = 0;
async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const sent = db.query<{ id: number; txid: string; sent_at: number }, []>(
      "SELECT id, txid, sent_at FROM links WHERE status = 'sent'",
    ).all();
    if (sent.length || Date.now() - lastSync > 60_000) {
      if (sent.some((s) => Date.now() - s.sent_at > 8_000)) await wallet.mine(); // regtest only: stand-in for the next block
      await wallet.sync();
      lastSync = Date.now();
      const mined = sent.length ? await wallet.minedHeights() : new Map<string, number>();
      for (const s of sent) {
        const height = mined.get(s.txid);
        if (height) {
          db.run("UPDATE links SET status = 'delivered', height = ?, delivered_at = ?, address = NULL WHERE id = ?", [
            height, Date.now(), s.id,
          ]);
        }
      }
    }
  } catch (e) {
    console.error("worker:", errorText(e));
  } finally {
    ticking = false;
  }
}

async function serveStatic(path: string) {
  const target = resolve(PUBLIC_DIR, `.${path}`);
  const file = Bun.file(target);
  if (target.startsWith(`${PUBLIC_DIR}/`) && (await file.exists())) return new Response(file, { headers: HEADERS });
  // A missing asset is a 404: answering with the app's HTML would let a CDN cache it as an image.
  if (/\.[a-z0-9]+$/i.test(path)) return new Response("Not found", { status: 404, headers: HEADERS });
  // Claim links are secrets and the dashboard is private: keep both out of search results.
  const robots = path.startsWith("/c/") || path === "/dashboard" ? { "x-robots-tag": "noindex" } : {};
  return new Response(Bun.file(`${PUBLIC_DIR}/index.html`), { headers: { ...HEADERS, ...robots, "content-type": "text/html" } });
}

const TOKEN = "([A-Za-z0-9_-]{22})";
export function start(port = Number(process.env.PORT ?? 3000)) {
  setInterval(tick, TICK_MS);
  return Bun.serve({
    port,
    hostname: process.env.HOST ?? "127.0.0.1",
    async fetch(req) {
      const path = new URL(req.url).pathname;
      let m: RegExpMatchArray | null;
      if (path === "/api/health") return json({ ok: true, network: NETWORK, sample: Boolean(DEMO_RECIPIENT) });
      if ((m = path.match(new RegExp(`^/api/link/${TOKEN}$`))) && req.method === "GET") {
        const link = linkByToken.get(hash(m[1]));
        return link ? json(view(link)) : fail(404, "This link doesn't exist.");
      }
      if ((m = path.match(new RegExp(`^/api/link/${TOKEN}/claim$`))) && req.method === "POST") return claim(m[1], req);
      if (path === "/api/sample" && req.method === "POST") return sampleLink();
      if (path.startsWith("/api/admin/")) {
        if (!admin(req)) return fail(401, "That access key doesn't match. Check it and try again.");
        if (path === "/api/admin/batches") return req.method === "POST" ? createBatch(req) : json(batches());
        if (path === "/api/admin/treasury") return json(await treasury());
        if (path === "/api/admin/payouts/next" && req.method === "POST") return nextPayout();
        if ((m = path.match(/^\/api\/admin\/payouts\/(\d+)$/)) && req.method === "POST") return submitPayout(Number(m[1]), req);
      }
      if (path.startsWith("/api/")) return fail(404, "Not found.");
      return serveStatic(path);
    },
    error: (e) => fail(500, errorText(e)),
  });
}

if (import.meta.main) {
  const server = start();
  console.log(`Cachet on ${server.url} (network ${NETWORK}, data ${DATA_DIR})`);
}
