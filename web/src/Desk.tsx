import { useCallback, useEffect, useState } from "react";
import { admin, day, FEE_ZATS, short, zec, type Batch, type Status, type Treasury } from "./api";
import { SealMark } from "./Seal";

const KEY = "cachet-desk-key";
const stored = () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } };
const store = (k: string) => { try { k ? sessionStorage.setItem(KEY, k) : sessionStorage.removeItem(KEY); } catch {} };

const WORD: Record<Status, string> = { sealed: "sealed", queued: "on its way", sent: "on its way", delivered: "delivered", expired: "expired" };
const MARK = { sealed: "sealed", queued: "travelling", sent: "travelling", delivered: "delivered", expired: "expired" } as const;

const field = "type mt-1 w-full border-0 border-b border-dashed border-rule bg-transparent py-2 text-base text-ink outline-none focus:border-ink";

export function Desk() {
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
        <a href="/" className="sc text-xl text-paper">Cachet</a>
        <button type="button" className="sc text-paper/70 hover:text-paper" onClick={() => { store(""); setKey(""); }}>
          Close the desk
        </button>
      </nav>
      {error && <p role="alert" className="mb-6 text-[#e7a08f]">{error}</p>}

      {treasury && (
        <section className="grid gap-6 border-y border-paper/15 py-8 sm:grid-cols-3">
          <div>
            <p className="sc text-paper/60">Treasury</p>
            <p className="type mt-1 text-2xl font-bold">{zec(treasury.spendable)} ZEC</p>
          </div>
          <div>
            <p className="sc text-paper/60">Promised in open links</p>
            <p className="type mt-1 text-2xl">{zec(treasury.reserved)} ZEC</p>
          </div>
          <div className="min-w-0">
            <p className="sc text-paper/60">Top up ({treasury.network})</p>
            <p className="type mt-2 text-sm text-paper/80">
              {short(treasury.address, 14, 8)}{" "}
              <button type="button" className="sc ml-2 underline underline-offset-4" onClick={() => navigator.clipboard.writeText(treasury.address)}>
                Copy
              </button>
            </p>
          </div>
        </section>
      )}

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_1.15fr]">
        <Compose deskKey={key} onSealed={(label, links) => { setFresh({ label, links }); load(); }} />
        <div className="space-y-6">
          {fresh && <Fresh {...fresh} onDone={() => setFresh(null)} />}
          {batches.map((b) => <BatchCard key={b.id} batch={b} />)}
          {!batches.length && !fresh && <p className="text-paper/60">Sealed batches appear here.</p>}
        </div>
      </div>
    </div>
  );
}

function Gate({ onKey, error }: { onKey: (k: string) => void; error: string | null }) {
  const [k, setK] = useState("");
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-5">
      <form className="paper w-full rounded-[3px] p-[9%]" onSubmit={(e) => { e.preventDefault(); if (k.trim()) onKey(k.trim()); }}>
        <h1 className="text-[2.2rem] leading-none">The desk</h1>
        <label htmlFor="desk-key" className="sc mt-6 block text-ink-soft">Desk key</label>
        <input id="desk-key" type="password" value={k} onChange={(e) => setK(e.target.value)} className={field} autoComplete="current-password" />
        {error && <p role="alert" className="mt-3 text-refuse">{error}</p>}
        <button type="submit" className="sc mt-7 rounded-[3px] bg-ink px-6 py-3 text-paper">Open</button>
      </form>
    </main>
  );
}

function Compose({ deskKey, onSealed }: { deskKey: string; onSealed: (label: string, links: string[]) => void }) {
  const [f, setF] = useState({ label: "", sender: "", note: "", amount: "0.0002", count: "5", days: "14" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zats = Math.round(Number(f.amount) * 1e8);
  const count = Math.max(0, Math.round(Number(f.count)));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function seal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await admin<{ links: string[] }>("batches", deskKey, {
        method: "POST",
        body: JSON.stringify({ label: f.label, sender: f.sender, note: f.note, zats, count, days: Number(f.days) }),
      });
      onSealed(f.label, r.links);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={seal} className="paper rounded-[3px] p-[8%]">
      <h2 className="text-[2rem] leading-none">Seal a batch</h2>
      <div className="mt-6 space-y-5">
        <label className="block"><span className="sc text-ink-soft">Batch</span><input className={field} value={f.label} onChange={set("label")} placeholder="October bounties" required /></label>
        <label className="block"><span className="sc text-ink-soft">From</span><input className={field} value={f.sender} onChange={set("sender")} placeholder="ZecHub" required /></label>
        <label className="block"><span className="sc text-ink-soft">Note in every payment</span><input className={field} value={f.note} onChange={set("note")} placeholder="Thanks for the wiki fixes" maxLength={200} /></label>
        <div className="grid grid-cols-3 gap-4">
          <label className="block"><span className="sc text-ink-soft">ZEC each</span><input className={field} value={f.amount} onChange={set("amount")} inputMode="decimal" /></label>
          <label className="block"><span className="sc text-ink-soft">Links</span><input className={field} value={f.count} onChange={set("count")} inputMode="numeric" /></label>
          <label className="block"><span className="sc text-ink-soft">Days</span><input className={field} value={f.days} onChange={set("days")} inputMode="numeric" /></label>
        </div>
      </div>
      <p className="type mt-6 text-sm text-ink-soft">
        At most {zec((zats + FEE_ZATS) * count)} ZEC leaves the treasury, network fees included, and only as links are opened.
      </p>
      {error && <p role="alert" className="mt-3 text-refuse">{error}</p>}
      <button type="submit" disabled={busy} className="sc mt-6 rounded-[3px] bg-ink px-6 py-3 text-paper disabled:opacity-60">
        {busy ? "Sealing…" : `Seal ${count || ""} link${count === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}

function Fresh({ label, links, onDone }: { label: string; links: string[]; onDone: () => void }) {
  const csv = `link\n${links.join("\n")}\n`;
  return (
    <section className="paper rounded-[3px] p-[7%]">
      <h2 className="text-[1.7rem] leading-tight">Copy these now.</h2>
      <p className="mt-2 leading-snug text-ink-soft">Cachet keeps only a fingerprint of each link, so it can't show them again.</p>
      <ol className="type mt-5 max-h-64 space-y-1 overflow-y-auto text-sm">
        {links.map((l) => <li key={l} className="truncate">{l}</li>)}
      </ol>
      <div className="sc mt-6 flex flex-wrap gap-5">
        <button type="button" className="underline underline-offset-4" onClick={() => navigator.clipboard.writeText(links.join("\n"))}>Copy all</button>
        <a className="underline underline-offset-4" download={`${label || "cachet"}-links.csv`} href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Download CSV</a>
        <button type="button" className="text-ink-soft underline underline-offset-4" onClick={onDone}>I've saved them</button>
      </div>
    </section>
  );
}

function BatchCard({ batch: b }: { batch: Batch }) {
  const counts = b.links.reduce<Record<string, number>>((m, l) => ({ ...m, [WORD[l.status]]: (m[WORD[l.status]] ?? 0) + 1 }), {});
  const monogram = (b.sender.trim()[0] ?? "C").toUpperCase();
  return (
    <article className="paper rounded-[3px] p-[6%]">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[1.5rem] leading-tight">{b.label}</h3>
        <span className="type text-sm text-ink-soft">{zec(b.zats)} ZEC × {b.links.length}</span>
      </header>
      <p className="sc mt-1 text-sm text-ink-soft">From {b.sender} · sealed {day(b.createdAt)} · expires {day(b.expiresAt)}</p>
      <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Links in this batch">
        {b.links.map((l) => (
          <li key={l.n} title={`Link ${l.n}: ${WORD[l.status]}${l.txid ? ` · ${short(l.txid)}` : ""}`}>
            <SealMark monogram={monogram} state={MARK[l.status]} />
            <span className="sr-only">Link {l.n}: {WORD[l.status]}</span>
          </li>
        ))}
      </ul>
      <p className="sc mt-4 text-sm text-ink-soft">{Object.entries(counts).map(([w, n]) => `${n} ${w}`).join(" · ")}</p>
    </article>
  );
}
