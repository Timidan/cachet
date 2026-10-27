import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { claimLink, day, getLink, PREFIX, zec, type LinkView } from "./api";
import { Coin, EASE } from "./Coin";
import { Receipt } from "./Receipt";

type Phase = "loading" | "missing" | "link" | "claiming" | "receipt";
type Pose = "offer" | "no" | "hold" | "cheer" | "sleep";
// Recipients see a plain message; the wallet's own error stays on the server.
const RETRY = "The payment didn't go through. Your link still works, so try again in a few minutes.";

/** The seal mascot, reacting to what is happening to the payment. */
export function Mascot({ pose, className = "" }: { pose: Pose; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.img
        key={pose}
        src={`/art/play/mascot-${pose}.webp`}
        alt=""
        draggable={false}
        className={`pointer-events-none select-none ${className}`}
        initial={reduce ? false : { scale: 0.8, y: 18, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={reduce ? undefined : { scale: 0.9, y: 10, opacity: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      />
    </AnimatePresence>
  );
}

export function Stage({ pose, children }: { pose: Pose; children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[540px] flex-col items-center px-4 pb-12 pt-6">
      <a href="/" className="sticker text-3xl">Cachet</a>
      <div className="relative mt-2 w-full">
        <div className="relative z-10 -mb-[clamp(2.5rem,9vw,3.5rem)] flex justify-center">
          <Mascot pose={pose} className="w-[min(58vw,250px)]" />
        </div>
        {children}
      </div>
    </main>
  );
}

export function Claim({ token }: { token: string }) {
  const [link, setLink] = useState<LinkView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [address, setAddress] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    getLink(token)
      .then((l) => {
        if (!l) return setPhase("missing");
        setLink(l);
        setPhase(l.status === "sealed" || l.status === "expired" ? "link" : "receipt");
        if (l.status === "sealed" && l.error) setRefusal(RETRY);
      })
      .catch(() => setPhase("missing"));
  }, [token]);

  // While the payment confirms, check on it quietly.
  const sending = link?.status === "queued" || link?.status === "sent";
  useEffect(() => {
    if (!sending) return;
    const t = setInterval(() => {
      getLink(token)
        .then((l) => {
          if (!l) return;
          setLink(l);
          // The payout failed and the link was released: let them try again.
          if (l.status === "sealed") {
            setPhase("link");
            setRefusal(l.error ? RETRY : null);
          }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [sending, token]);

  async function claim() {
    const a = address.trim();
    if (busy) return;
    if (!a) {
      setRefusal("Paste your shielded Zcash address first.");
      field.current?.focus();
      return;
    }
    setBusy(true);
    setRefusal(null);
    try {
      setLink(await claimLink(token, a));
      setPhase("claiming");
      setTimeout(() => setPhase("receipt"), reduce ? 0 : 1100);
    } catch (e) {
      const err = e as Error & { body?: Partial<LinkView> };
      if (err.body?.status) setLink(err.body as LinkView); // claimed elsewhere, or expired meanwhile
      setRefusal(err.message);
      requestAnimationFrame(() => field.current?.focus()); // the error is read with the field
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") return <main className="min-h-dvh" />;
  if (phase === "missing" || !link)
    return (
      <Stage pose="no">
        <section className="card w-full px-[7%] pb-[7%] pt-[clamp(3.5rem,12vw,4.5rem)]">
          <h1 className="sticker text-balance text-[2.6rem] leading-none">Link not found</h1>
          <p className="mt-3 text-lg">Check that you copied the whole link.</p>
        </section>
      </Stage>
    );

  const expired = link.status === "expired";
  const ready = address.trim().length > 0 && !busy;
  const pose: Pose =
    phase === "receipt" ? (link.status === "delivered" ? "cheer" : "hold") : expired ? "sleep" : refusal ? "no" : "offer";

  return (
    <Stage pose={pose}>
      <AnimatePresence mode="popLayout" initial={false}>
        {phase === "receipt" ? (
          <motion.div key="receipt" initial={reduce ? false : { y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: EASE }}>
            <Receipt link={link} address={address.trim() || undefined} />
          </motion.div>
        ) : (
          <motion.section
            key="link"
            className="card w-full px-[7%] pb-[7%] pt-[clamp(3.5rem,12vw,4.5rem)]"
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0, transition: { duration: 0.5, ease: EASE } }}
          >
            <div className="flex items-center gap-4">
              <Coin broken={phase === "claiming"} ready={ready} />
              <h1 className="min-w-0">
                <span className="block text-sm font-extrabold uppercase tracking-wide text-ink-soft">{link.sender} sent you</span>{" "}
                <span className="sticker mt-1 block text-[clamp(2.4rem,10vw,3.6rem)] leading-none">{zec(link.zats)} ZEC</span>
              </h1>
            </div>
            {link.note && <p className="mt-3 text-pretty text-xl">{link.note}</p>}

            {expired ? (
              <div className="mt-6 rounded-[20px] border-[3px] border-dashed border-ink/40 p-5">
                <p className="text-lg font-extrabold">This link expired on {day(link.expiresAt)}.</p>
                <p className="mt-1">The payment was never sent. Ask {link.sender} for a new link.</p>
              </div>
            ) : (
              <form
                className="mt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  claim();
                }}
              >
                <label htmlFor="address" className="font-extrabold">Your shielded Zcash address</label>
                <input
                  ref={field}
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={`${PREFIX[link.network]}…`}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  disabled={busy || phase === "claiming"}
                  aria-invalid={refusal ? true : undefined}
                  aria-describedby={refusal ? "address-error" : undefined}
                  className="field field-mono mt-2"
                />
                {link.demoAddress && !address.trim() && (
                  <button
                    type="button"
                    className="mt-2 inline-flex min-h-6 items-center py-1 text-sm font-extrabold underline decoration-2 underline-offset-4"
                    onClick={() => setAddress(link.demoAddress!)}
                  >
                    Testing? Use a demo address
                  </button>
                )}
                {refusal && <p id="address-error" className="mt-3 text-pretty font-bold leading-snug text-refuse">{refusal}</p>}
                <button type="submit" disabled={busy || phase === "claiming"} className="pill pill-ink mt-6 w-full">
                  {busy ? "Checking address…" : "Claim payment"}
                </button>
                <p className="mt-3 text-pretty text-center text-sm leading-snug text-ink-soft">Sent privately. Cachet deletes your address once it's paid.</p>
              </form>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </Stage>
  );
}
