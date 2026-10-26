import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { claimLink, day, getLink, PREFIX, zec, type LinkView } from "./api";
import { Letter } from "./Letter";
import { EASE, Seal } from "./Seal";
import { Postmark, Stamp } from "./Stamp";

type Phase = "loading" | "missing" | "envelope" | "opening" | "letter";
const retry = (error: string) => `The payment didn't go through (${error}). Your link still works, so try again.`;

export function Stage({ children }: { children?: React.ReactNode }) {
  return <main className="mx-auto grid min-h-dvh w-full max-w-[600px] place-items-center px-4 py-12">{children}</main>;
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="paper w-full rounded-[3px] px-[8%] py-[9%]">
      <h1 className="text-[2.4rem] leading-none">{title}</h1>
      <div className="mt-4 text-[1.15rem] leading-relaxed">{children}</div>
    </section>
  );
}

export function Claim({ token }: { token: string }) {
  const [link, setLink] = useState<LinkView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [address, setAddress] = useState("");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    getLink(token)
      .then((l) => {
        if (!l) return setPhase("missing");
        setLink(l);
        setPhase(l.status === "sealed" || l.status === "expired" ? "envelope" : "letter");
        if (l.status === "sealed" && l.error) setRefusal(retry(l.error));
      })
      .catch(() => setPhase("missing"));
  }, [token]);

  // While the payment waits for its block, check on it quietly.
  const travelling = link?.status === "queued" || link?.status === "sent";
  useEffect(() => {
    if (!travelling) return;
    const t = setInterval(() => {
      getLink(token)
        .then((l) => {
          if (!l) return;
          setLink(l);
          // The payout failed and the link was released: hand the envelope back.
          if (l.status === "sealed") {
            setPhase("envelope");
            setRefusal(l.error ? retry(l.error) : null);
          }
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [travelling, token]);

  async function open() {
    const a = address.trim();
    if (!a || busy) return;
    setBusy(true);
    setRefusal(null);
    try {
      setLink(await claimLink(token, a));
      setPhase("opening");
      setTimeout(() => setPhase("letter"), reduce ? 0 : 1300);
    } catch (e) {
      const err = e as Error & { body?: Partial<LinkView> };
      if (err.body?.status) setLink(err.body as LinkView); // opened elsewhere, or expired meanwhile
      setRefusal(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") return <Stage />;
  if (phase === "missing" || !link)
    return (
      <Stage>
        <Notice title="No letter here.">This link doesn't exist, or part of it is missing.</Notice>
      </Stage>
    );

  return (
    <Stage>
      <div className="relative w-full" style={{ perspective: 1600 }}>
        <AnimatePresence mode="popLayout">
          {phase !== "letter" && (
            <Envelope
              key="envelope"
              link={link}
              address={address}
              setAddress={setAddress}
              refusal={refusal}
              busy={busy}
              opening={phase === "opening"}
              onOpen={open}
            />
          )}
          {phase === "letter" && (
            <motion.div
              key="letter"
              initial={reduce ? false : { y: 110, opacity: 0, rotate: -1.6 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: 1.05, ease: EASE }}
            >
              <Letter link={link} address={address.trim() || undefined} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Stage>
  );
}

function Envelope({ link, address, setAddress, refusal, busy, opening, onOpen }: {
  link: LinkView; address: string; setAddress: (a: string) => void; refusal: string | null;
  busy: boolean; opening: boolean; onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const expired = link.status === "expired";
  const ready = address.trim().length > 0;
  return (
    <motion.section
      className="paper w-full rounded-[3px]"
      exit={reduce ? { opacity: 0 } : { y: 160, opacity: 0, transition: { duration: 0.75, ease: EASE } }}
    >
      {/* The flap folds down over the face and lifts open once the seal breaks. */}
      <div className="relative aspect-[600/250] w-full" style={{ transformStyle: "preserve-3d" }}>
        <motion.svg
          viewBox="0 0 600 250"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full origin-top"
          initial={false}
          animate={{ rotateX: opening ? 172 : 0 }}
          transition={{ duration: reduce ? 0 : 0.85, ease: EASE, delay: reduce ? 0 : 0.3 }}
          aria-hidden
        >
          <path d="M0 0H600L300 244Z" fill="#ddcfb1" />
          <path d="M0 0L300 244L600 0" fill="none" stroke="rgba(37,28,19,.22)" strokeWidth="1.5" />
        </motion.svg>
        <div className="absolute right-[4%] top-[9%] flex items-start">
          <div className="-mr-7 mt-7 -rotate-6 max-sm:hidden">
            <Postmark at={link.createdAt} />
          </div>
          <Stamp zats={link.zats} network={link.network} />
        </div>
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
          <Seal
            monogram={(link.sender.trim()[0] ?? "C").toUpperCase()}
            broken={opening}
            disabled={expired || busy || !ready}
            onPress={onOpen}
            label={`Break the seal and receive ${zec(link.zats)} ZEC from ${link.sender}`}
          />
        </div>
      </div>

      <div className="px-[8%] pb-[8%] pt-[clamp(66px,17vw,86px)]">
        <p className="sc text-ink-soft">From {link.sender}</p>
        {link.note && <p className="mt-1 text-[1.45rem] italic leading-snug">{link.note}</p>}
        {expired ? (
          <div className="mt-7">
            <span className="sc inline-block -rotate-3 border-2 border-ink-soft/70 px-3 py-1 text-ink-soft">Returned to sender</span>
            <p className="mt-4 text-[1.1rem] leading-relaxed">
              This link expired on {day(link.expiresAt)}. The money never left {link.sender}.
            </p>
          </div>
        ) : (
          <form
            className="mt-7"
            onSubmit={(e) => {
              e.preventDefault();
              onOpen();
            }}
          >
            <label htmlFor="deliver-to" className="sc text-ink-soft">Deliver to</label>
            <input
              id="deliver-to"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={`${PREFIX[link.network]}…`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              disabled={busy || opening}
              className="type mt-1 w-full border-0 border-b border-dashed border-rule bg-transparent py-2 text-base text-ink outline-none placeholder:text-ink-soft/55 focus:border-ink"
            />
            {refusal ? (
              <p role="alert" className="mt-3 leading-snug text-refuse">{refusal}</p>
            ) : (
              <p className="sc mt-3 text-sm text-ink-soft" aria-live="polite">
                {busy ? "Checking the address…" : ready ? "Now break the seal." : "Paste a shielded address, then break the seal."}
              </p>
            )}
          </form>
        )}
      </div>
    </motion.section>
  );
}
