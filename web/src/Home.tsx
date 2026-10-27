import { useEffect, useState } from "react";
import { ArrowRight, CircleAlert, Clock, KeyRound, Link2, Lock, ShieldCheck, Sparkle, Wallet } from "lucide-react";
import { Journey } from "./Journey";
import { Receipt } from "./Receipt";
import { health, sampleLink, type LinkView } from "./api";

// A real payout made through Cachet's API on its regtest chain (block 233).
const SAMPLE: LinkView = {
  status: "delivered", sender: "Zecathon", note: "Thanks for judging", zats: 20_000, network: "regtest",
  createdAt: 1793057700000, expiresAt: 1793662524675, height: 233, deliveredAt: 1793057737638, error: null, demoAddress: null,
  txid: "72e7f8083940d57014bc4e8cb14e869a9a056379d9de959a31014016b92a1ba0",
};
const SAMPLE_ADDRESS =
  "uregtest150swjtm94ljj7mf59v3k8cqtfh6a2qj6ee5s5kzlyatgxzganezypnlgxvzl46qv3ce9yr95h9359frty85ctc04t2zjqv9p8cyll7raqjhdf7gxtkkjv9qegk7gwy2wvedsq4szh00l0n4nu6excsatplf7n24wf3t4mw4hs5wf0hz93gjtftmfn64lqkyvzhuluwv5dw69kmmmpdz";

const TICKER = [
  [ShieldCheck, "Shielded"], [Lock, "No address lists"], [KeyRound, "Your key signs"], [Clock, "Links expire"], [Wallet, "Any wallet"],
] as const;

const STEPS = [
  ["Create links", "Choose an amount and a message. You get one link per person, and nothing moves on-chain yet."],
  ["Send them", "By email, Signal or chat. Cachet stores only a fingerprint of each link."],
  ["They claim", "They paste a shielded address. Cachet refuses public addresses before anything is built."],
  ["You approve", "Your signer signs the payout with your key; Cachet holds only a viewing key. The ZEC arrives privately and the address is deleted."],
];

const COMPARE = [
  ["The money moves", "when you make the card", "when they claim the link"],
  ["If it's never claimed", "the money waits in the card", "it never leaves your treasury"],
  ["Who can spend it", "anyone holding the card's link", "only your key, after a claim"],
  ["How many at once", "four cards per batch in Vizor", "up to 200 links per batch"],
  ["To receive", "a wallet that redeems gift cards", "any shielded address"],
];

function Ticker() {
  const items = [...TICKER, ...TICKER, ...TICKER, ...TICKER]; // two identical halves, so the drift loops seamlessly
  return (
    <div className="mx-5 overflow-hidden rounded-[22px] border-[3px] border-ink bg-sun-soft py-4 sm:mx-8" aria-label="Shielded, no address lists, your key signs, links expire, any wallet">
      <div className="drift flex w-max items-center" aria-hidden>
        {items.map(([Icon, label], i) => (
          <span key={i} className="flex items-center gap-3 px-8 text-xl font-black uppercase tracking-wide">
            <Icon className="size-7" strokeWidth={2.5} />
            {label}
            <span className="pl-8 text-2xl">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  const [sample, setSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  useEffect(() => { health().then((h) => setSample(h.sample)).catch(() => {}); }, []);
  const tryDemo = () =>
    sampleLink().then(({ url }) => location.assign(url)).catch((e: Error) => setSampleError(e.message));

  return (
    <div className="overflow-x-hidden">
      <a href="#main" className="pill pill-ink sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">Skip to content</a>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/art/play/coin.webp" alt="" className="size-11" />
          <span className="sticker text-[2.1rem] leading-none">Cachet</span>
        </a>
        <div className="hidden items-center gap-9 text-lg font-extrabold md:flex">
          <a href="#how" className="hover:underline hover:decoration-2 hover:underline-offset-4">How it works</a>
          <a href="#compare" className="hover:underline hover:decoration-2 hover:underline-offset-4">Compare</a>
        </div>
        <a href="/dashboard" className="pill pill-ink">Dashboard</a>
      </nav>

      <main id="main">
      <section className="mx-auto grid max-w-7xl items-center gap-4 px-5 pb-10 pt-2 sm:px-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative z-10">
          <h1 className="sticker text-balance text-[clamp(3.5rem,10vw,7.4rem)] leading-[0.92]">Pay anyone with a link.</h1>
          <p className="mt-7 max-w-xl text-pretty text-[clamp(1.25rem,2.4vw,1.6rem)] font-bold leading-[1.45]">
            Your ZEC stays in your treasury until they claim it and your key signs, then arrives shielded. No addresses to collect.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            {sample && (
              <button type="button" onClick={tryDemo} className="group pill pill-ink">
                Try a demo payout{" "}
                <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={3} />
              </button>
            )}
            <a href="/dashboard" className={`pill ${sample ? "pill-line" : "pill-ink"}`}>Create payout links</a>
          </div>
          {sampleError && (
            <p role="alert" className="mt-5 inline-flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 font-bold">
              <CircleAlert className="size-5 shrink-0 text-refuse" strokeWidth={2.5} aria-hidden />
              {sampleError}
            </p>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-[580px]">
          <img src="/art/play/mascot-hold.webp" alt="Cachet's mascot, a seal, holding a gold coin" className="relative w-full" />
          <Sparkle className="wobble absolute left-[3%] top-[14%] size-12" fill="#111" strokeWidth={1.5} aria-hidden />
          <Sparkle className="wobble absolute right-[10%] top-[3%] size-9" fill="#111" strokeWidth={1.5} style={{ animationDelay: "-1.4s" }} aria-hidden />
          <Link2 className="wobble absolute right-[1%] top-[24%] size-16" strokeWidth={2.6} style={{ animationDelay: "-0.7s" }} aria-hidden />
          <img src="/art/play/coin-split.webp" alt="" className="wobble absolute bottom-[16%] right-[-3%] w-[24%]" style={{ animationDelay: "-2s" }} />
        </div>
      </section>

      <Ticker />

      <section id="how" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-20 sm:px-8">
        <h2 className="sticker text-balance text-[clamp(2.6rem,6vw,4.2rem)] leading-none">How it works</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title}>
              <span className="sticker text-[4.6rem] leading-none">{i + 1}</span>
              <h3 className="mt-2 text-2xl font-black">{title}</h3>
              <p className="mt-2 text-pretty text-lg leading-snug">{body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <figure>
            <Receipt link={SAMPLE} address={SAMPLE_ADDRESS} level="h3" />
            <figcaption className="mt-4 text-center font-extrabold text-ink-soft">A real payout, made with Cachet on its test network</figcaption>
          </figure>
          <div id="compare" className="card scroll-mt-6 p-[clamp(1.5rem,4vw,2.5rem)]">
            <h2 className="sticker text-balance text-[clamp(2.2rem,5vw,3rem)] leading-none">Why not a gift card?</h2>
            <p className="mt-3 text-pretty text-lg font-bold">For a gift, use your wallet. To pay people from a treasury, use Cachet.</p>
            {/* In a narrow card each row stacks: its label on top, the two answers side by side. The roles keep it a table for screen readers. */}
            <div className="@container mt-6">
              <table role="table" className="w-full border-collapse text-left @max-md:block">
                <thead className="@max-md:block">
                  <tr role="row" className="text-sm font-black uppercase tracking-wide text-ink-soft @max-md:grid @max-md:grid-cols-2 @max-md:gap-x-4">
                    <th className="w-[32%] pb-2 @max-md:hidden" />
                    <th role="columnheader" className="pb-2">Wallet gift cards</th>
                    <th role="columnheader" className="pb-2 text-ink">Cachet</th>
                  </tr>
                </thead>
                <tbody className="@max-md:block">
                  {COMPARE.map(([row, gift, cachet]) => (
                    <tr key={row} role="row" className="border-t-[3px] border-dashed border-ink/15 @max-md:grid @max-md:grid-cols-2 @max-md:gap-x-4">
                      <th role="rowheader" scope="row" className="py-3 pr-4 text-sm font-black uppercase tracking-wide text-ink-soft @max-md:col-span-2 @max-md:pb-1">{row}</th>
                      <td role="cell" className="py-3 pr-4 text-ink-soft @max-md:pt-0">{gift}</td>
                      <td role="cell" className="py-3 font-extrabold @max-md:pt-0">{cachet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              From the{" "}
              <a className="underline decoration-2 underline-offset-4" href="https://github.com/chainapsis/vizor-wallet/releases">Vizor release notes</a>{" "}
              and the{" "}
              <a className="underline decoration-2 underline-offset-4" href="https://github.com/zodl-inc/zodl-ios/blob/main/CHANGELOG.md">Zodl changelog</a>.
            </p>
          </div>
        </div>
      </section>

      <section id="under-the-hood" className="mx-auto max-w-7xl scroll-mt-6 px-5 pb-20 sm:px-8">
        <h2 className="sticker text-balance text-[clamp(2.6rem,6vw,4.2rem)] leading-none">Under the hood</h2>
        <p className="mt-3 max-w-2xl text-pretty text-lg font-bold">
          Follow one payout from link to wallet, or paste a public address and watch Cachet refuse it.
        </p>
        <Journey />
      </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t-[3px] border-ink px-5 py-8 font-extrabold sm:px-8">
        <span>Built for Zecathon 2026</span>
        <span>Private payouts on Zcash</span>
      </footer>
    </div>
  );
}
