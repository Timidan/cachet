import { motion, useReducedMotion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;
const ART = "/art/seal-512.webp";

// The two halves the seal cracks into, split along one jagged line (percent of the seal's box).
const HALVES = [
  { clip: "polygon(0 0, 52% 0, 47.5% 19%, 54.5% 33%, 47% 49%, 55% 64%, 48.5% 80%, 52.5% 100%, 0 100%)", fall: { x: -38, y: 74, rotate: -24 } },
  { clip: "polygon(52% 0, 100% 0, 100% 100%, 52.5% 100%, 48.5% 80%, 55% 64%, 47% 49%, 54.5% 33%, 47.5% 19%)", fall: { x: 40, y: 88, rotate: 19 } },
];
const FLAKES = [
  { x: -70, y: -40, r: 140, s: 9 }, { x: 64, y: -52, r: -110, s: 7 }, { x: -86, y: 26, r: 200, s: 6 },
  { x: 90, y: 18, r: -160, s: 8 }, { x: -24, y: 96, r: 90, s: 5 }, { x: 30, y: 104, r: -80, s: 6 },
];

/** The poured seal with the sender's initial pressed into its well. */
function SealArt({ monogram }: { monogram: string }) {
  return (
    <>
      <img src={ART} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <text x="101.4" y="117.4" textAnchor="middle" fontFamily="IM Fell English, serif" fontSize="62" fill="#f6cf74" fillOpacity="0.45">
          {monogram}
        </text>
        <text x="100" y="116" textAnchor="middle" fontFamily="IM Fell English, serif" fontSize="62" fill="#4a2f08" fillOpacity="0.82">
          {monogram}
        </text>
      </svg>
    </>
  );
}

/** The wax seal, which is also the button that opens the letter. */
export function Seal({ monogram, broken, disabled, onPress, label }: {
  monogram: string; broken: boolean; disabled?: boolean; onPress?: () => void; label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onPress}
      disabled={disabled || broken}
      aria-label={label}
      whileTap={disabled || broken ? undefined : { scale: 0.95 }}
      className={`relative block size-[clamp(120px,32vw,158px)] cursor-pointer rounded-full disabled:cursor-default ${disabled || broken ? "" : "seal-ready"}`}
      style={{ filter: "drop-shadow(0 10px 12px rgba(0,0,0,.4))" }}
    >
      {/* Whole until it breaks: two pre-cut halves would show a hairline seam. */}
      {broken ? (
        HALVES.map((h, i) => (
          <motion.span
            key={i}
            className="absolute inset-0"
            style={{ clipPath: h.clip }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ ...h.fall, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
          >
            <SealArt monogram={monogram} />
          </motion.span>
        ))
      ) : (
        <span className="absolute inset-0">
          <SealArt monogram={monogram} />
        </span>
      )}
      {broken && !reduce &&
        FLAKES.map((f, i) => (
          <motion.span
            key={`f${i}`}
            className="absolute left-1/2 top-1/2"
            style={{ width: f.s, height: f.s, background: "#b07a22", clipPath: "polygon(50% 0,100% 40%,70% 100%,0 70%)" }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x: f.x, y: f.y, rotate: f.r, opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        ))}
    </motion.button>
  );
}

/** A small seal for lists: whole, cracked (on its way), opened (delivered) or faded (expired). */
export function SealMark({ monogram, state }: { monogram: string; state: "sealed" | "travelling" | "delivered" | "expired" }) {
  const apart = state === "delivered" ? 5 : state === "travelling" ? 1.5 : 0;
  return (
    <span className="relative inline-block size-8" style={{ filter: state === "expired" ? "grayscale(1) opacity(.45)" : undefined }}>
      {apart ? (
        HALVES.map((h, i) => (
          <span key={i} className="absolute inset-0" style={{ clipPath: h.clip, transform: `translateX(${i ? apart : -apart}px)` }}>
            <SealArt monogram={monogram} />
          </span>
        ))
      ) : (
        <span className="absolute inset-0">
          <SealArt monogram={monogram} />
        </span>
      )}
    </span>
  );
}
