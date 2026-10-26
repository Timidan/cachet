import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;
const WAX = { hi: "#f0c35c", mid: "#c48a26", lo: "#6f4a10" };

// The two halves the seal cracks into, split along one jagged line.
const HALVES = [
  { d: "M0 0H104L95 38L109 66L94 98L110 128L97 160L105 200H0Z", fall: { x: -38, y: 74, rotate: -24 } },
  { d: "M104 0H200V200H105L97 160L110 128L94 98L109 66L95 38Z", fall: { x: 40, y: 88, rotate: 19 } },
];
const FLAKES = [
  { x: -70, y: -40, r: 140, s: 9 }, { x: 64, y: -52, r: -110, s: 7 }, { x: -86, y: 26, r: 200, s: 6 },
  { x: 90, y: 18, r: -160, s: 8 }, { x: -24, y: 96, r: 90, s: 5 }, { x: 30, y: 104, r: -80, s: 6 },
];

function SealArt({ monogram, id, clip }: { monogram: string; id: string; clip?: string }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <defs>
        <filter id={`${id}e`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id={`${id}b`} cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor={WAX.hi} />
          <stop offset="0.45" stopColor={WAX.mid} />
          <stop offset="1" stopColor={WAX.lo} />
        </radialGradient>
        <radialGradient id={`${id}w`} cx="62%" cy="66%" r="72%">
          <stop offset="0" stopColor={WAX.mid} />
          <stop offset="1" stopColor={WAX.lo} />
        </radialGradient>
        {clip && <clipPath id={`${id}c`}><path d={clip} /></clipPath>}
      </defs>
      <g clipPath={clip ? `url(#${id}c)` : undefined}>
        <g filter={`url(#${id}e)`}>
          <circle cx="100" cy="100" r="82" fill={`url(#${id}b)`} />
          <circle cx="150" cy="158" r="13" fill={`url(#${id}b)`} />
        </g>
        <circle cx="100" cy="100" r="60" fill={`url(#${id}w)`} />
        <circle cx="100" cy="100" r="60" fill="none" stroke={WAX.hi} strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="100" cy="100" r="53" fill="none" stroke={WAX.lo} strokeWidth="3" strokeDasharray="0.5 7.5" strokeLinecap="round" />
        <text x="101.6" y="123.6" textAnchor="middle" fontFamily="IM Fell English, serif" fontSize="70" fill={WAX.hi} fillOpacity="0.5">
          {monogram}
        </text>
        <text x="100" y="122" textAnchor="middle" fontFamily="IM Fell English, serif" fontSize="70" fill={WAX.lo}>
          {monogram}
        </text>
      </g>
    </svg>
  );
}

/** The wax seal, which is also the button that opens the letter. */
export function Seal({ monogram, broken, disabled, onPress, label }: {
  monogram: string; broken: boolean; disabled?: boolean; onPress?: () => void; label: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onPress}
      disabled={disabled || broken}
      aria-label={label}
      whileTap={disabled || broken ? undefined : { scale: 0.95 }}
      className={`relative block size-[clamp(112px,30vw,148px)] cursor-pointer rounded-full disabled:cursor-default ${disabled || broken ? "" : "seal-ready"}`}
      style={{ filter: "drop-shadow(0 10px 14px rgba(0,0,0,.45))" }}
    >
      {/* Whole until it breaks: two pre-cut halves would show a hairline seam. */}
      {broken ? (
        HALVES.map((h, i) => (
          <motion.span
            key={i}
            className="absolute inset-0"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ ...h.fall, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.95, ease: EASE }}
          >
            <SealArt monogram={monogram} id={`${id}${i}`} clip={h.d} />
          </motion.span>
        ))
      ) : (
        <span className="absolute inset-0">
          <SealArt monogram={monogram} id={`${id}w`} />
        </span>
      )}
      {broken && !reduce &&
        FLAKES.map((f, i) => (
          <motion.span
            key={`f${i}`}
            className="absolute left-1/2 top-1/2"
            style={{ width: f.s, height: f.s, background: WAX.mid, clipPath: "polygon(50% 0,100% 40%,70% 100%,0 70%)" }}
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
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const apart = state === "delivered" ? 5 : state === "travelling" ? 1.5 : 0;
  return (
    <span className="relative inline-block size-7" style={{ filter: state === "expired" ? "grayscale(1) opacity(.45)" : undefined }}>
      {apart ? (
        HALVES.map((h, i) => (
          <span key={i} className="absolute inset-0" style={{ transform: `translateX(${i ? apart : -apart}px)` }}>
            <SealArt monogram={monogram} id={`${id}${i}`} clip={h.d} />
          </span>
        ))
      ) : (
        <span className="absolute inset-0">
          <SealArt monogram={monogram} id={`${id}w`} />
        </span>
      )}
    </span>
  );
}
