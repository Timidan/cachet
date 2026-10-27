import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { short, zec, type LinkView } from "./api";

/** A copy button that says whether the text reached the clipboard (some in-app browsers block it),
 *  then goes back to "Copy" so it can be used again. */
export function Copy({ text, label, children = "Copy", className = "inline-flex min-h-7 items-center rounded-full border-2 border-ink px-3 text-sm font-extrabold hover:bg-ink hover:text-sun" }: {
  text: string; label?: string; children?: string; className?: string;
}) {
  const [result, setResult] = useState<string | null>(null);
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 2000);
    return () => clearTimeout(t);
  }, [result]);
  return (
    <button
      type="button"
      aria-label={result ? undefined : label}
      className={`${className} gap-1`}
      onClick={() =>
        Promise.resolve()
          .then(() => navigator.clipboard.writeText(text))
          .then(() => setResult("Copied"), () => setResult("Couldn't copy"))
      }
    >
      <AnimatePresence initial={false}>
        {result === "Copied" && (
          <motion.span
            key="ok"
            className="inline-flex"
            initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          >
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {result ?? children}
    </button>
  );
}

function Row({ label, i, children }: { label: string; i: number; children: React.ReactNode }) {
  return (
    <div className="rise grid grid-cols-[8rem_1fr] items-center gap-3 py-2 max-sm:grid-cols-1 max-sm:gap-1" style={{ "--i": i } as React.CSSProperties}>
      <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">{label}</span>
      <span className="font-bold">{children}</span>
    </div>
  );
}

/** The payment after it is claimed: waiting for the organiser to sign, sending, then received with its proof.
 *  `address` is what the recipient typed on this page; the server no longer has it.
 *  `level` keeps the outline right: the claim page's h1, a sub-heading when shown on the landing page. */
export function Receipt({ link, address, level: Heading = "h1" }: { link: LinkView; address?: string; level?: "h1" | "h3" }) {
  const received = link.status === "delivered";
  const waiting = link.status === "queued";
  return (
    <article className="card w-full px-[7%] pb-[7%] pt-[clamp(3.5rem,12vw,4.5rem)]">
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">From {link.sender}</span>
        {link.height != null && <span className="font-mono text-sm font-medium">Block {link.height}</span>}
      </header>
      <Heading className="sticker mt-3 text-balance text-[clamp(2.8rem,10vw,4.2rem)] leading-[0.95]">{received ? "Received" : waiting ? "Claimed" : "Sending…"}</Heading>
      {/* A stable region, so each change of state is announced. */}
      <p role="status" className="sr-only">
        {received ? `Received ${zec(link.zats)} ZEC` : waiting ? `Claimed. Waiting for ${link.sender} to approve the payment` : `Sending ${zec(link.zats)} ZEC to your address`}
      </p>
      <p className="mt-3 font-mono text-[clamp(1.4rem,5vw,1.9rem)] font-medium">{zec(link.zats)} ZEC</p>
      {link.note && <p className="mt-2 text-pretty text-xl">“{link.note}”</p>}
      <hr className="my-6 border-t-[3px] border-dashed border-ink/25" />
      {received && link.txid ? (
        <div>
          <Row label="Transaction" i={0}>
            <span className="mr-3 font-mono font-medium">{short(link.txid)}</span>
            <Copy text={link.txid} label="Copy transaction ID" />
          </Row>
          <Row label="Your address" i={1}>
            {address ? (
              <>
                <span className="mr-2 font-mono font-medium text-ink-soft line-through decoration-2">{short(address, 12, 6)}</span>
                deleted from Cachet
              </>
            ) : (
              "Deleted from Cachet after payment"
            )}
          </Row>
          <Row label="Privacy" i={2}>Only the network fee is public on-chain</Row>
        </div>
      ) : (
        <div className="flex items-center gap-4 text-ink-soft">
          <svg viewBox="0 0 600 12" preserveAspectRatio="none" className="h-3 min-w-10 flex-1" aria-hidden>
            <path className="ink-line" d="M2 6c50-6 100 6 150 0s100-6 150 0 100 6 150 0 100-6 146 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-right font-extrabold">{waiting ? `Waiting for ${link.sender} to approve` : "Confirming on the Zcash network"}</span>
        </div>
      )}
    </article>
  );
}
