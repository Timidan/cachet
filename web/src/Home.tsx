import { Letter } from "./Letter";
import type { LinkView } from "./api";

// A real payout made through Cachet's API on its regtest chain (block 233).
const SAMPLE: LinkView = {
  status: "delivered", sender: "Zecathon", note: "Thanks for judging", zats: 20_000, network: "regtest",
  createdAt: 1793057700000, expiresAt: 1793662524675, height: 233, deliveredAt: 1793057737638, error: null,
  txid: "72e7f8083940d57014bc4e8cb14e869a9a056379d9de959a31014016b92a1ba0",
};

const COMPARE = [
  ["The money moves", "when you make the card", "when they open the link"],
  ["If nobody opens it", "the money waits in the card", "the money never left your treasury"],
  ["How many at once", "four cards per batch in Vizor", "up to 200 links per batch"],
  ["To receive", "a wallet that redeems gift cards", "any shielded address"],
];

export function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <nav className="flex items-center justify-between py-6">
        <a href="/" className="sc text-xl text-paper">Cachet</a>
        <a href="/desk" className="sc text-paper/75 hover:text-paper">Open the desk</a>
      </nav>

      <section className="grid items-center gap-14 pb-16 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
        <div>
          <h1 className="text-[clamp(2.9rem,7.4vw,5.2rem)] leading-[0.94]">Pay anyone with a sealed link.</h1>
          <p className="mt-7 max-w-xl text-[clamp(1.2rem,2.4vw,1.45rem)] leading-relaxed text-paper/80">
            The money stays in your treasury until they open it. They give a shielded address once, it's paid in
            Zcash, and Cachet forgets the address.
          </p>
          <a href="/desk" className="paper sc mt-9 inline-block rounded-[3px] px-7 py-3.5 text-lg">Open the desk</a>
        </div>
        <figure className="mx-auto w-full max-w-[540px] rotate-[1.4deg]">
          <Letter link={SAMPLE} address="uregtest150swjtm94ljj7mf59v3k8cqtfh6a2qj6ee5s5kzlyatgxzganezypnlgxvzl46qv3ce9yr95h9359frty85ctc04t2zjqv9p8cyll7raqjhdf7gxtkkjv9qegk7gwy2wvedsq4szh00l0n4nu6excsatplf7n24wf3t4mw4hs5wf0hz93gjtftmfn64lqkyvzhuluwv5dw69kmmmpdz" />
          <figcaption className="sc mt-4 text-center text-sm text-paper/55">A real payout, on Cachet's regtest chain</figcaption>
        </figure>
      </section>

      <section className="border-t border-paper/15 py-16">
        <h2 className="max-w-3xl text-[clamp(1.8rem,4vw,2.6rem)] leading-tight">
          For a gift, use your wallet. For a payout from a treasury, use Cachet.
        </h2>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[1.1rem]">
            <thead>
              <tr className="sc text-paper/60">
                <th className="w-[30%] py-3 font-normal" />
                <th className="py-3 font-normal">Wallet gift cards</th>
                <th className="py-3 font-normal text-paper">Cachet</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([row, gift, cachet]) => (
                <tr key={row} className="border-t border-paper/10">
                  <th className="sc py-4 pr-6 font-normal text-paper/60">{row}</th>
                  <td className="py-4 pr-6 text-paper/70">{gift}</td>
                  <td className="py-4 text-paper">{cachet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-paper/45">
          From the{" "}
          <a className="underline underline-offset-4" href="https://github.com/chainapsis/vizor-wallet/releases">Vizor release notes</a>{" "}
          and the{" "}
          <a className="underline underline-offset-4" href="https://github.com/zodl-inc/zodl-ios/blob/main/CHANGELOG.md">Zodl changelog</a>.
        </p>
      </section>

      <footer className="sc flex flex-wrap justify-between gap-3 border-t border-paper/15 py-8 text-sm text-paper/45">
        <span>Built for Zecathon 2026</span>
        <span>Shielded payouts in Zcash's Ironwood pool</span>
      </footer>
    </div>
  );
}
