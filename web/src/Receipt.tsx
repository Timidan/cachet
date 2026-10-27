import { useState } from "react";
import { short, zec, type LinkView } from "./api";

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex min-h-7 items-center rounded-full border-2 border-ink px-3 text-sm font-extrabold hover:bg-ink hover:text-sun"
      onClick={() => navigator.clipboard.writeText(text).then(() => setDone(true))}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-center gap-3 py-2 max-sm:grid-cols-1 max-sm:gap-1">
      <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">{label}</span>
      <span className="font-bold">{children}</span>
    </div>
  );
}

/** The payment after it is claimed: sending, then received with its proof.
 *  `address` is what the recipient typed on this page; the server no longer has it.
 *  `level` keeps the outline right: the claim page's h1, a sub-heading when shown on the landing page. */
export function Receipt({ link, address, level: Heading = "h1" }: { link: LinkView; address?: string; level?: "h1" | "h3" }) {
  const received = link.status === "delivered";
  return (
    <article className="card w-full px-[7%] pb-[7%] pt-[clamp(3.5rem,12vw,4.5rem)]">
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">From {link.sender}</span>
        {link.height != null && <span className="font-mono text-sm font-medium">Block {link.height}</span>}
      </header>
      <Heading className="sticker mt-3 text-balance text-[clamp(2.8rem,10vw,4.2rem)] leading-[0.95]">{received ? "Received" : "Sending…"}</Heading>
      {/* A stable region, so the change from sending to received is announced. */}
      <p role="status" className="sr-only">{received ? `Received ${zec(link.zats)} ZEC` : `Sending ${zec(link.zats)} ZEC to your address`}</p>
      <p className="mt-3 font-mono text-[clamp(1.4rem,5vw,1.9rem)] font-medium">{zec(link.zats)} ZEC</p>
      {link.note && <p className="mt-2 text-pretty text-xl">“{link.note}”</p>}
      <hr className="my-6 border-t-[3px] border-dashed border-ink/25" />
      {received && link.txid ? (
        <div>
          <Row label="Transaction">
            <span className="mr-3 font-mono font-medium">{short(link.txid)}</span>
            <Copy text={link.txid} label="Copy transaction ID" />
          </Row>
          <Row label="Your address">
            {address ? (
              <>
                <span className="mr-2 font-mono font-medium text-ink-soft line-through decoration-2">{short(address, 12, 6)}</span>
                deleted from Cachet
              </>
            ) : (
              "Deleted from Cachet after payment"
            )}
          </Row>
          <Row label="Privacy">Amount and addresses are hidden on-chain</Row>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-ink-soft">
          <svg viewBox="0 0 600 12" preserveAspectRatio="none" className="h-3 flex-1" aria-hidden>
            <path className="ink-line" d="M2 6c50-6 100 6 150 0s100-6 150 0 100 6 150 0 100-6 146 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="shrink-0 font-extrabold">Confirming on the Zcash network</span>
        </div>
      )}
    </article>
  );
}
