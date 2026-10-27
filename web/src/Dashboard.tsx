import { useCallback, useEffect, useState } from "react";
import { admin, day, FEE_ZATS, short, zec, type Batch, type Status, type Treasury } from "./api";
import { CircleAlert } from "lucide-react";
import { CoinMark } from "./Coin";
import { Copy } from "./Receipt";

const KEY = "cachet-access-key";
const stored = () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } };
const store = (k: string) => { try { k ? sessionStorage.setItem(KEY, k) : sessionStorage.removeItem(KEY); } catch {} };

const WORD: Record<Status, string> = { sealed: "unclaimed", queued: "to approve", sent: "sending", delivered: "paid", expired: "expired" };
const MARK = { sealed: "sealed", queued: "travelling", sent: "travelling", delivered: "delivered", expired: "expired" } as const;

const field = "field mt-2";
// Big balances read better at four decimals; small sums keep full precision so nothing rounds away.
const balance = (zats: number) => zec(zats, zats >= 1e8 ? 4 : 8);

export function Dashboard() {
  const [key, setKey] = useState(stored);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ label: string; links: string[] } | null>(null);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      const [t, b] = await Promise.all([admin<Treasury>("treasury", key), admin<Batch[]>("batches", key)]);
      setTreasury(t);
      setBatches(b);
      setError(null);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 401) { store(""); setKey(""); }
      setError(err.message);
    }
  }, [key]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (!key) return <Gate error={error} onKey={(k) => { store(k); setKey(k); setError(null); }} />;

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
      <nav className="flex items-center justify-between py-6">
        <a href="/" className="sticker text-[2rem] leading-none">Cachet</a>
        <button type="button" className="pill pill-line px-5 py-2 text-base" onClick={() => { store(""); setKey(""); }}>
          Sign out
        </button>
      </nav>
      <main id="main">
      <h1 className="sr-only">Dashboard</h1>
      {error && (
        <p role="alert" className="mb-6 flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-bold">
          <CircleAlert className="size-5 shrink-0 text-refuse" strokeWidth={2.5} aria-hidden />
          {error}
        </p>
      )}

      {treasury && (
        <section className="card grid gap-6 p-7 sm:grid-cols-2">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-ink-soft">Treasury balance</p>
            <p className="sticker-flat mt-1 whitespace-nowrap text-[clamp(1.7rem,3.2vw,2.2rem)] leading-none">{balance(treasury.spendable)} ZEC</p>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-ink-soft">Reserved for unclaimed links</p>
            <p className="sticker-flat mt-1 whitespace-nowrap text-[clamp(1.7rem,3.2vw,2.2rem)] leading-none">{balance(treasury.reserved)} ZEC</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-ink-soft">
              Add funds
              {treasury.network !== "main" && <span className="ml-2 rounded-full border-2 border-ink px-2 py-px text-xs normal-case tracking-normal text-ink">Test network</span>}
            </p>
            <p className="mt-2 font-mono text-sm">
              {short(treasury.address, 14, 8)}{" "}
              <Copy text={treasury.address} label="Copy funding address" className="ml-2 inline-flex min-h-6 items-center py-1 font-extrabold underline decoration-2 underline-offset-4" />
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-ink-soft">Audit key</p>
            <p className="mt-2 font-mono text-sm">
              {short(treasury.auditKey, 14, 8)}{" "}
              <Copy text={treasury.auditKey} label="Copy audit key" className="ml-2 inline-flex min-h-6 items-center py-1 font-extrabold underline decoration-2 underline-offset-4" />
            </p>
            <p className="mt-1 text-pretty text-sm leading-snug text-ink-soft">Shows every amount paid out, not who received it. It can't spend.</p>
          </div>
        </section>
      )}

      {treasury && treasury.awaiting > 0 && (
        <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="sticker-flat text-[1.6rem] leading-tight">
              {treasury.awaiting} payout{treasury.awaiting === 1 ? "" : "s"} to approve
            </h2>
            <p className="mt-1 text-pretty font-bold text-ink-soft">Cachet never holds your spending key. Run your signer where the key is kept.</p>
          </div>
          <p className="flex items-center gap-3 font-mono text-sm">
            bun signer.ts
            <Copy text="bun signer.ts" label="Copy signer command" />
          </p>
        </section>
      )}

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_1.15fr]">
        <Create accessKey={key} onCreated={(label, links) => { setFresh({ label, links }); load(); }} />
        <div className="space-y-6">
          {fresh && <Fresh {...fresh} onDone={() => setFresh(null)} />}
          {batches.map((b) => <BatchCard key={b.id} batch={b} />)}
          {!batches.length && !fresh && (
            <div className="card p-[7%]">
              <h2 className="sticker-flat text-[1.8rem] leading-tight">No payout links yet</h2>
              <p className="mt-2 text-pretty font-bold text-ink-soft">Fill in the form to create your first batch. Each person gets their own link.</p>
            </div>
          )}
        </div>
      </div>
      </main>
    </div>
  );
}

function Gate({ onKey, error }: { onKey: (k: string) => void; error: string | null }) {
  const [k, setK] = useState("");
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-5">
      <form className="card w-full p-[9%]" onSubmit={(e) => { e.preventDefault(); if (k.trim()) onKey(k.trim()); }}>
        <h1 className="sticker text-[2.6rem] leading-none">Sign in</h1>
        <p className="mt-2 font-bold text-ink-soft">to your Cachet dashboard</p>
        <label htmlFor="access-key" className="mt-6 block font-extrabold">Access key</label>
        <input id="access-key" type="password" value={k} onChange={(e) => setK(e.target.value)} className={field} autoComplete="current-password" required />
        {error && <p role="alert" className="mt-3 text-refuse">{error}</p>}
        <button type="submit" className="pill pill-ink mt-7">Sign in</button>
      </form>
    </main>
  );
}

function Create({ accessKey, onCreated }: { accessKey: string; onCreated: (label: string, links: string[]) => void }) {
  const [f, setF] = useState({ label: "", sender: "", note: "", amount: "0.0002", count: "5", days: "14" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zats = Math.round(Number(f.amount) * 1e8);
  const count = Math.max(0, Math.round(Number(f.count)));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await admin<{ links: string[] }>("batches", accessKey, {
        method: "POST",
        body: JSON.stringify({ label: f.label, sender: f.sender, note: f.note, zats, count, days: Number(f.days) }),
      });
      onCreated(f.label, r.links);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="card p-[8%]">
      <h2 className="sticker text-balance text-[2.4rem] leading-none">Create payout links</h2>
      <div className="mt-6 space-y-5">
        <label className="block"><span className="font-extrabold">Name</span><input className={field} value={f.label} onChange={set("label")} placeholder="October bounties" required /></label>
        <label className="block"><span className="font-extrabold">From (shown to recipients)</span><input className={field} value={f.sender} onChange={set("sender")} placeholder="ZecHub" required /></label>
        <label className="block"><span className="font-extrabold">Message (sent with the payment)</span><input className={field} value={f.note} onChange={set("note")} placeholder="Thanks for the wiki fixes" maxLength={200} /></label>
        <div className="grid grid-cols-3 items-end gap-4 max-sm:grid-cols-1">
          <label className="block"><span className="font-extrabold">ZEC per link</span><input className={`${field} field-mono`} value={f.amount} onChange={set("amount")} inputMode="decimal" /></label>
          <label className="block"><span className="font-extrabold">Links</span><input className={`${field} field-mono`} value={f.count} onChange={set("count")} inputMode="numeric" /></label>
          <label className="block"><span className="font-extrabold">Days valid</span><input className={`${field} field-mono`} value={f.days} onChange={set("days")} inputMode="numeric" /></label>
        </div>
      </div>
      <p className="mt-6 text-pretty text-sm text-ink-soft">
        Up to <span className="font-mono font-medium text-ink">{zec((zats + FEE_ZATS) * count)} ZEC</span>, network fees included, leaves your treasury, and only as links are claimed.
      </p>
      {error && <p role="alert" className="mt-3 text-refuse">{error}</p>}
      <button type="submit" disabled={busy} className="pill pill-ink mt-6">
        {busy ? "Creating…" : `Create ${count || ""} link${count === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}

function Fresh({ label, links, onDone }: { label: string; links: string[]; onDone: () => void }) {
  const csv = `link\n${links.join("\n")}\n`;
  return (
    <section className="card p-[7%]">
      <h2 className="sticker text-balance text-[2.2rem] leading-none">Your links are ready</h2>
      <p className="mt-2 font-bold leading-snug text-ink-soft">Save them now. For privacy, Cachet stores only a fingerprint of each link and can't show them again.</p>
      <ol className="mt-5 max-h-64 space-y-1 overflow-y-auto font-mono text-sm">
        {links.map((l) => <li key={l} className="truncate">{l}</li>)}
      </ol>
      <div className="mt-6 flex flex-wrap gap-5 font-extrabold">
        <Copy text={links.join("\n")} className="underline decoration-2 underline-offset-4">Copy all</Copy>
        <a className="underline decoration-2 underline-offset-4" download={`${label || "cachet"}-links.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Download CSV</a>
        <button type="button" className="text-ink-soft underline decoration-2 underline-offset-4" onClick={onDone}>Done</button>
      </div>
    </section>
  );
}

function BatchCard({ batch: b }: { batch: Batch }) {
  const counts = b.links.reduce<Record<string, number>>((m, l) => ({ ...m, [WORD[l.status]]: (m[WORD[l.status]] ?? 0) + 1 }), {});
  return (
    <article className="card p-[6%]">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="sticker-flat text-balance text-[1.8rem] leading-tight">{b.label}</h3>
        <span className="font-mono text-sm text-ink-soft">{zec(b.zats)} ZEC × {b.links.length}</span>
      </header>
      <p className="mt-1 text-sm font-bold text-ink-soft">
        From {b.sender} · <span className="whitespace-nowrap">created {day(b.createdAt)}</span> · <span className="whitespace-nowrap">expires {day(b.expiresAt)}</span>
      </p>
      <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Links in this batch">
        {b.links.map((l) => (
          <li key={l.n} title={`Link ${l.n}: ${WORD[l.status]}${l.txid ? ` · ${short(l.txid)}` : ""}`}>
            <CoinMark state={MARK[l.status]} />
            <span className="sr-only">Link {l.n}: {WORD[l.status]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-extrabold uppercase tracking-wide text-ink-soft">{Object.entries(counts).map(([w, n]) => `${n} ${w}`).join(" · ")}</p>
    </article>
  );
}
