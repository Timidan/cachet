import { zec, type Network } from "./api";

/** The postage stamp: an engraved ironwood, the pool every Cachet payout travels through. Its value is the payment. */
export function Stamp({ zats, network }: { zats: number; network: Network }) {
  return (
    <div className="stamp grid h-[96px] w-[78px] place-items-center bg-paper p-[7px]" aria-hidden>
      <div className="flex h-full w-full flex-col items-center justify-between border border-ink/40 px-1 pb-1 pt-1.5 text-ink">
        <img src="/art/ironwood.png" alt="" className="h-[42px] w-[42px] object-contain" draggable={false} />
        <span className="type text-[10.5px] font-bold leading-none">{zec(zats)}</span>
        <span className="sc text-[8.5px] leading-none tracking-[.08em]">{network === "main" ? "Ironwood" : `Ironwood · ${network}`}</span>
      </div>
    </div>
  );
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** The postmark, dated the day the letter was sealed. */
export function Postmark({ at }: { at: number }) {
  const d = new Date(at);
  return (
    <svg viewBox="0 0 150 70" className="h-[56px] w-[120px] text-ink/45" aria-hidden>
      <defs>
        <path id="pm-top" d="M14 35a21 21 0 0 1 42 0" />
      </defs>
      <circle cx="35" cy="35" r="27" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="35" cy="35" r="20" fill="none" stroke="currentColor" strokeWidth=".8" />
      <text fontFamily="IM Fell English SC, serif" fontSize="8.5" fill="currentColor" letterSpacing="1.5">
        <textPath href="#pm-top" startOffset="50%" textAnchor="middle">SEALED</textPath>
      </text>
      <text x="35" y="37" textAnchor="middle" fontFamily="Courier Prime, monospace" fontSize="8" fill="currentColor">
        {String(d.getDate()).padStart(2, "0")} {MONTHS[d.getMonth()]}
      </text>
      <text x="35" y="46" textAnchor="middle" fontFamily="Courier Prime, monospace" fontSize="8" fill="currentColor">
        {d.getFullYear()}
      </text>
      {[24, 31, 38, 45].map((y) => (
        <path key={y} d={`M66 ${y}q10-5 20 0t20 0t20 0t20 0`} fill="none" stroke="currentColor" strokeWidth="1.2" />
      ))}
    </svg>
  );
}
