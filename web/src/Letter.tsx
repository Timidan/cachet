import { useState } from "react";
import { short, zec, type LinkView } from "./api";

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="sc text-sm text-ink-soft underline decoration-rule underline-offset-4 hover:text-ink"
      onClick={() => navigator.clipboard.writeText(text).then(() => setDone(true))}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 py-1.5 max-sm:grid-cols-1 max-sm:gap-0">
      <span className="sc text-sm text-ink-soft">{label}</span>
      <span>{children}</span>
    </div>
  );
}

/** The letter inside the envelope: the payment itself, then the proof that it arrived.
 *  `address` is what the recipient typed on this page; the server no longer has it. */
export function Letter({ link, address }: { link: LinkView; address?: string }) {
  const delivered = link.status === "delivered";
  return (
    <article className="paper w-full rounded-[3px] px-[8%] pb-[8%] pt-[7%]">
      <header className="flex items-baseline justify-between">
        <span className="sc text-ink-soft">Cachet</span>
        {link.height != null && <span className="type text-sm text-ink-soft">Block {link.height}</span>}
      </header>
      <h1 className="mt-5 text-[clamp(2.5rem,8vw,3.75rem)] leading-[0.95]">{delivered ? "Delivered." : "On its way."}</h1>
      <p className="type mt-4 text-[clamp(1.4rem,4.6vw,1.9rem)] font-bold">{zec(link.zats)} ZEC</p>
      {link.note && <p className="mt-4 text-[1.35rem] italic leading-snug">“{link.note}”</p>}
      <p className="sc mt-1 text-ink-soft">— {link.sender}</p>
      {delivered && link.txid ? (
        <>
          <hr className="my-6 border-rule/70" />
          <div className="text-[1.05rem]">
            <Row label="Transaction">
              <span className="type mr-3 text-[0.95rem]">{short(link.txid)}</span>
              <Copy text={link.txid} />
            </Row>
            <Row label="Your address">
              {address ? (
                <>
                  <span className="type mr-3 text-[0.95rem] text-ink-soft line-through decoration-ink/60">{short(address, 12, 6)}</span>
                  deleted from Cachet
                </>
              ) : (
                "Deleted from Cachet"
              )}
            </Row>
            <Row label="On-chain">Amount and both addresses hidden, in the Ironwood pool</Row>
          </div>
        </>
      ) : (
        <>
          {/* The rule keeps drawing itself while the payment waits for its block. */}
          <svg viewBox="0 0 600 12" preserveAspectRatio="none" className="my-6 h-3 w-full text-ink-soft" aria-hidden>
            <path className="ink-line" d="M2 6c50-6 100 6 150 0s100-6 150 0 100 6 150 0 100-6 146 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p className="text-ink-soft">Waiting for the next block.</p>
        </>
      )}
    </article>
  );
}
