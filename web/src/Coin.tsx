import { motion, useReducedMotion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;
const COIN = "/art/play/coin.webp";

// The two halves the coin cracks into, split along one jagged line (percent of its box).
const HALVES = [
  { clip: "polygon(0 0, 52% 0, 47.5% 19%, 54.5% 33%, 47% 49%, 55% 64%, 48.5% 80%, 52.5% 100%, 0 100%)", fall: { x: -46, y: 70, rotate: -26 } },
  { clip: "polygon(52% 0, 100% 0, 100% 100%, 52.5% 100%, 48.5% 80%, 55% 64%, 47% 49%, 54.5% 33%, 47.5% 19%)", fall: { x: 48, y: 82, rotate: 22 } },
];
const SPARKS = [
  { x: -84, y: -54, s: 16 }, { x: 78, y: -66, s: 12 }, { x: -100, y: 18, s: 10 },
  { x: 102, y: 10, s: 14 }, { x: -30, y: -96, s: 11 }, { x: 36, y: -92, s: 9 },
];

/** The gold seal-coin beside the amount. It glows while the payment is ready to claim and cracks open
 *  when it is claimed. Decorative only: the Claim payment button is the control. */
export function Coin({ broken, ready }: { broken: boolean; ready: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={`relative block size-[clamp(72px,20vw,104px)] shrink-0 rounded-full ${ready && !broken ? "coin-ready" : ""}`}
      style={{ filter: "drop-shadow(0 5px 0 rgba(0,0,0,.25))" }}
    >
      {/* Whole until it cracks: two pre-cut halves would show a hairline seam. */}
      {broken ? (
        HALVES.map((h, i) => (
          <motion.img
            key={i}
            src={COIN}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
            style={{ clipPath: h.clip }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ ...h.fall, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
          />
        ))
      ) : (
        <img src={COIN} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
      )}
      {broken && !reduce &&
        SPARKS.map((s, i) => (
          <motion.svg
            key={`s${i}`}
            viewBox="0 0 24 24"
            className="absolute left-1/2 top-1/2"
            style={{ width: s.s, height: s.s, marginLeft: -s.s / 2, marginTop: -s.s / 2 }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{ x: s.x, y: s.y, scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="#111" />
          </motion.svg>
        ))}
    </span>
  );
}

/** A small coin for lists: whole (unclaimed), cracked (sending), split (paid) or faded (expired).
 *  The halves slide apart as a link moves on, so a refresh that changes its state shows the change. */
export function CoinMark({ state }: { state: "sealed" | "travelling" | "delivered" | "expired" }) {
  const apart = state === "delivered" ? 5 : state === "travelling" ? 1.5 : 0;
  const move = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
  return (
    <span
      className="relative inline-block size-8 transition-[filter] duration-500 motion-reduce:transition-none"
      style={{ filter: state === "expired" ? "grayscale(1) opacity(.4)" : undefined }}
    >
      {HALVES.map((h, i) => (
        <img
          key={i}
          src={COIN}
          alt=""
          className={`absolute inset-0 h-full w-full ${move}`}
          style={{ clipPath: h.clip, transform: `translateX(${i ? apart : -apart}px)` }}
        />
      ))}
      {/* Whole while unclaimed: the halves side by side would show a hairline seam. */}
      <img src={COIN} alt="" className={`absolute inset-0 h-full w-full ${move} ${apart ? "opacity-0" : ""}`} />
    </span>
  );
}
