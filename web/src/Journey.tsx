import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import {
  animate, AnimatePresence, motion, MotionConfig, useInView, useMotionValue, useReducedMotion, type AnimationPlaybackControls,
} from "motion/react";
import { Check, RotateCcw, Stamp, X } from "lucide-react";

// One payout's path through Cachet, in the site's own stickers: a coin hops from the link to the address check to
// your signer, slips through the shielded pool and lands in the winner's wallet. A transparent address bounces it
// back. Only transform and opacity move, and the status line says each step in words.
type Kind = "shielded" | "transparent";
type Beat = "start" | "checked" | "refused" | "signing" | "signed" | "pool" | "received";
type P = { x: number; y: number };

const SAY: Record<Beat, string> = {
  start: "A winner opens their link.",
  checked: "They paste a shielded address, and it passes the check.",
  refused: "A transparent address would make the payment public, so Cachet refuses it. The money stays in the treasury.",
  signing: "Cachet builds the payout with its viewing key. Your signer signs it.",
  signed: "Signed with your key. Cachet never holds it.",
  pool: "It crosses the shielded pool. Amount, sender, recipient and memo are hidden; only the fee is public.",
  received: "Received, memo and all. Cachet has deleted the address.",
};
const COIN = "/art/play/coin.webp";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// A segment between two sockets, stopping short of each so the line meets the rim, not the middle.
function seg(a: P, b: P, inset: number) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  return { x1: a.x + ux * inset, y1: a.y + uy * inset, x2: b.x - ux * inset, y2: b.y - uy * inset };
}

function Station({ socket, card, title, children }: {
  socket: (el: HTMLDivElement | null) => void; card?: Ref<HTMLDivElement>; title: string; children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 @3xl:flex-col @3xl:items-stretch @3xl:gap-5">
      <div ref={socket} aria-hidden className="size-[72px] shrink-0 rounded-full border-[3px] border-dashed border-ink/30 @3xl:self-center" />
      <div ref={card} className="min-w-0 flex-1 self-stretch rounded-[22px] border-[3px] border-ink bg-cream p-4 @3xl:min-h-[10.5rem]">
        <h3 className="text-lg font-black">{title}</h3>
        <div className="mt-1.5 text-pretty leading-snug">{children}</div>
      </div>
    </li>
  );
}

export function Journey() {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const sockets = useRef<(HTMLDivElement | null)[]>([]);
  const checkCard = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState<P[]>([]);
  const ptsRef = useRef<P[]>([]);
  const [kind, setKind] = useState<Kind>("shielded");
  const [beat, setBeat] = useState<Beat>("start");
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const at = useRef(0);
  const gen = useRef(0);
  const live = useRef<AnimationPlaybackControls[]>([]);
  const inView = useInView(stage, { once: true, amount: 0.4 });

  // The coin, the light inside the pipe, the ring a stamp leaves, and the stamp.
  const x = useMotionValue(0), y = useMotionValue(0), sx = useMotionValue(1), sy = useMotionValue(1);
  const rot = useMotionValue(0), op = useMotionValue(0);
  const gx = useMotionValue(0), gy = useMotionValue(0), gop = useMotionValue(0);
  const rx = useMotionValue(0), ry = useMotionValue(0), rs = useMotionValue(1), rop = useMotionValue(0);
  const tx = useMotionValue(0), ty = useMotionValue(0), tsy = useMotionValue(1), trot = useMotionValue(0), top = useMotionValue(0);

  const go = <T extends AnimationPlaybackControls>(c: T) => { live.current.push(c); return c; };
  const move = (on: boolean) => { movingRef.current = on; setMoving(on); };

  // Socket centres, relative to the stage, on every resize; a resting coin follows its socket.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const o = el.getBoundingClientRect();
      const next = sockets.current.map((s) => {
        const r = s!.getBoundingClientRect();
        return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 };
      });
      ptsRef.current = next;
      setPts(next);
      if (!movingRef.current) { x.set(next[at.current].x); y.set(next[at.current].y); op.set(1); }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { ro.disconnect(); gen.current++; live.current.forEach((c) => c.stop()); };
  }, []);

  async function hop(i: number, j: number, alive: () => boolean, size = 1) {
    const a = ptsRef.current[i], b = ptsRef.current[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const row = Math.abs(dx) >= Math.abs(dy);
    const n = row ? { x: 0, y: -1 } : { x: 1, y: 0 }; // up in a row, out to the right in a column
    const lift = Math.min(row ? 46 : 20, Math.hypot(dx, dy) * 0.22) * size;
    const lean = Math.sign(dx || dy) * 12;
    move(true);
    // Anticipation: it crouches before it jumps.
    go(animate(sx, 1.1, { duration: 0.14, ease: "easeOut" }));
    await go(animate(sy, 0.84, { duration: 0.14, ease: "easeOut" }));
    if (!alive()) return;
    // The hop: slow in and out along the way, a parabola across it, stretched and leaning while airborne.
    await go(animate(0, 1, {
      duration: 0.42 + 0.18 * size, ease: [0.45, 0, 0.25, 1],
      onUpdate: (v) => {
        const arc = 4 * v * (1 - v), off = 1 - Math.min(1, v * 5);
        x.set(a.x + dx * v + n.x * lift * arc);
        y.set(a.y + dy * v + n.y * lift * arc);
        sy.set(1 + 0.12 * arc - 0.16 * off);
        sx.set(1 - 0.07 * arc + 0.1 * off);
        rot.set(lean * arc);
      },
    }));
    if (!alive()) return;
    at.current = j;
    // Landing: it squashes, then settles past and back.
    sx.jump(1.16); sy.jump(0.82); rot.jump(0);
    go(animate(sx, 1, { type: "spring", stiffness: 600, damping: 13 }));
    go(animate(sy, 1, { type: "spring", stiffness: 600, damping: 13 }));
    move(false);
  }

  async function stampIt(alive: () => boolean) {
    const p = ptsRef.current[2];
    tx.set(p.x); ty.set(p.y - 96); trot.set(-12); tsy.set(1);
    await go(animate(top, 1, { duration: 0.2 }));
    if (!alive()) return;
    // Anticipation: the stamp rises and tilts back before it strikes.
    go(animate(trot, -20, { duration: 0.26, ease: "easeOut" }));
    await go(animate(ty, p.y - 112, { duration: 0.26, ease: "easeOut" }));
    if (!alive()) return;
    go(animate(trot, 0, { duration: 0.13, ease: "easeIn" }));
    await go(animate(ty, p.y - 52, { duration: 0.13, ease: [0.6, 0, 1, 0.6] }));
    if (!alive()) return;
    // Impact: stamp and coin squash, a ring goes out, and the station says it's signed.
    setBeat("signed");
    tsy.jump(0.8);
    go(animate(tsy, 1, { type: "spring", stiffness: 700, damping: 16 }));
    sx.jump(1.14); sy.jump(0.86);
    go(animate(sx, 1, { type: "spring", stiffness: 600, damping: 12 }));
    go(animate(sy, 1, { type: "spring", stiffness: 600, damping: 12 }));
    rx.set(p.x); ry.set(p.y); rs.set(1); rop.set(0.7);
    go(animate(rs, 2, { duration: 0.6, ease: "easeOut" }));
    go(animate(rop, 0, { duration: 0.6, ease: "easeOut" }));
    await wait(280);
    if (!alive()) return;
    // Follow-through: it lifts away and fades.
    go(animate(ty, p.y - 100, { duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }));
    await go(animate(top, 0, { duration: 0.4, delay: 0.08 }));
  }

  async function throughPool(alive: () => boolean) {
    const a = ptsRef.current[2], b = ptsRef.current[3];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    move(true);
    // It slips into the pipe.
    await go(animate(0, 1, {
      duration: 0.32, ease: "easeIn",
      onUpdate: (v) => { x.set(a.x + ux * 30 * v); y.set(a.y + uy * 30 * v); sx.set(1 - 0.55 * v); sy.set(1 - 0.55 * v); op.set(1 - v); },
    }));
    if (!alive()) return;
    // Something travels inside, and you can't see what.
    await go(animate(0, 1, {
      duration: 1.3, ease: [0.45, 0, 0.55, 1],
      onUpdate: (v) => { gx.set(a.x + (b.x - a.x) * v); gy.set(a.y + (b.y - a.y) * v); gop.set(Math.min(1, v * 6, (1 - v) * 6)); },
    }));
    if (!alive()) return;
    // It pops out at the far end and overshoots a little.
    at.current = 3;
    x.jump(b.x); y.jump(b.y); rot.jump(0); sx.jump(0.35); sy.jump(0.35);
    go(animate(op, 1, { duration: 0.15 }));
    go(animate(sx, 1, { type: "spring", stiffness: 380, damping: 11 }));
    await go(animate(sy, 1, { type: "spring", stiffness: 380, damping: 11 }));
    move(false);
  }

  // Starting again stops whatever was in flight, so there is only ever one coin.
  async function play(next: Kind) {
    const my = ++gen.current;
    const alive = () => gen.current === my;
    live.current.forEach((c) => c.stop());
    live.current = [];
    setKind(next);
    setBeat("start");
    const p = ptsRef.current;
    if (p.length < 4) return;
    at.current = 0;
    x.jump(p[0].x); y.jump(p[0].y); sx.jump(1); sy.jump(1); rot.jump(0); op.jump(1); gop.jump(0); top.jump(0); rop.jump(0);
    move(false);
    if (reduce) {
      const end = next === "shielded" ? 3 : 0;
      at.current = end;
      x.jump(p[end].x); y.jump(p[end].y);
      setBeat(next === "shielded" ? "received" : "refused");
      return;
    }
    await wait(450);
    if (!alive()) return;
    await hop(0, 1, alive);
    if (!alive()) return;
    if (next === "transparent") {
      // The one exaggerated beat: the card shakes and the coin is thrown back.
      setBeat("refused");
      if (checkCard.current) go(animate(checkCard.current, { x: [0, -9, 8, -5, 3, 0] }, { duration: 0.45, ease: "easeOut" }));
      await wait(700);
      if (!alive()) return;
      await hop(1, 0, alive, 0.55);
      return;
    }
    setBeat("checked");
    await wait(900);
    if (!alive()) return;
    await hop(1, 2, alive);
    if (!alive()) return;
    setBeat("signing");
    await stampIt(alive);
    if (!alive()) return;
    await wait(350);
    if (!alive()) return;
    setBeat("pool");
    await throughPool(alive);
    if (!alive()) return;
    setBeat("received");
  }

  useEffect(() => { if (inView && pts.length === 4) play("shielded"); }, [inView, pts.length]);

  const landed = beat !== "start";
  const signed = beat === "signed" || beat === "pool" || beat === "received";
  const received = beat === "received";

  return (
    <MotionConfig reducedMotion="user">
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="The address the winner pastes" className="inline-flex rounded-full border-[3px] border-ink bg-cream p-1">
          {(["shielded", "transparent"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => play(k)}
              className={`min-h-10 whitespace-nowrap rounded-full px-4 font-extrabold transition-colors duration-150 ${kind === k ? "bg-ink text-sun" : "hover:bg-sun-soft"}`}>
              {k === "shielded" ? "Shielded" : "Transparent"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => play(kind)} className="group pill pill-line min-h-12 !px-5 !py-2 !text-base">
          <RotateCcw className="size-4 transition-transform duration-300 group-hover:-rotate-90 motion-reduce:transition-none" strokeWidth={3} aria-hidden />
          Replay
        </button>
      </div>

      <div ref={stage} className="@container relative mt-8 md:mt-14">
        <ol className="grid gap-5 @3xl:grid-cols-4 @3xl:gap-6">
          <Station socket={(el) => { sockets.current[0] = el; }} title="A link">
            One per person. Nothing has left the treasury.
          </Station>
          <Station socket={(el) => { sockets.current[1] = el; }} card={checkCard} title="Address check">
            <AnimatePresence initial={false}>
              {!landed ? (
                <p key="wait" className="text-ink-soft">Only a shielded address gets through.</p>
              ) : (
                <motion.div key={kind} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", duration: 0.45, bounce: 0.3 }} className="flex flex-col items-start gap-2">
                  <span className={`rounded-full border-2 border-ink bg-white px-3 py-0.5 font-mono text-sm transition-opacity duration-500 ${received ? "line-through decoration-2 opacity-45" : ""}`}>
                    {kind === "shielded" ? "u1… shielded" : "t1… transparent"}
                  </span>
                  {kind === "transparent" ? (
                    <span className="inline-flex items-center gap-1.5 font-extrabold text-refuse"><X className="size-4" strokeWidth={3} aria-hidden />Refused: it's public</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-extrabold"><Check className="size-4" strokeWidth={3} aria-hidden />{received ? "Deleted after delivery" : "Accepted"}</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Station>
          <Station socket={(el) => { sockets.current[2] = el; }} title="Your key signs">
            <p>Cachet builds it with a viewing key. Only your signer can sign.</p>
            <AnimatePresence initial={false}>
              {signed && (
                <motion.p key="signed" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.45 }} className="mt-2 inline-flex origin-left items-center gap-1.5 font-extrabold">
                  <Check className="size-4" strokeWidth={3} aria-hidden />Signed
                </motion.p>
              )}
            </AnimatePresence>
          </Station>
          <Station socket={(el) => { sockets.current[3] = el; }} title="Received">
            <AnimatePresence initial={false}>
              {!received ? (
                <p key="wait" className="text-ink-soft">Through the shielded pool, where only the fee is public.</p>
              ) : (
                <motion.div key="memo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}>
                  <p className="font-extrabold">“Thanks for judging”</p>
                  <p className="text-sm text-ink-soft">A memo only the winner can read.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Station>
        </ol>

        {pts.length === 4 && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
            {[0, 1].map((i) => (
              <line key={i} {...seg(pts[i], pts[i + 1], 44)} className="stroke-ink/40" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
            ))}
            <line {...seg(pts[2], pts[3], 40)} className="stroke-ink" strokeWidth={24} strokeLinecap="round" />
            <line {...seg(pts[2], pts[3], 46)} stroke="white" strokeOpacity={0.2} strokeWidth={4} strokeDasharray="1 12" strokeLinecap="round" />
            {pts[3].x - pts[2].x > 160 && (
              <text x={(pts[2].x + pts[3].x) / 2} y={pts[2].y - 24} textAnchor="middle" className="fill-ink text-[13px] font-black uppercase tracking-wide">
                Shielded pool
              </text>
            )}
          </svg>
        )}
        <motion.div aria-hidden className="pointer-events-none absolute left-0 top-0 -ml-[11px] -mt-[11px] size-[22px] rounded-full bg-sun-soft shadow-[0_0_16px_7px_var(--color-sun)]"
          style={{ x: gx, y: gy, opacity: gop }} />
        <motion.div aria-hidden className="pointer-events-none absolute left-0 top-0 -ml-7 -mt-7 size-14 rounded-full border-[3px] border-ink"
          style={{ x: rx, y: ry, scale: rs, opacity: rop }} />
        <motion.div aria-hidden className="pointer-events-none absolute left-0 top-0 -ml-7 -mt-7 size-14 origin-[50%_85%]"
          style={{ x, y, scaleX: sx, scaleY: sy, rotate: rot, opacity: op }}>
          <img src={COIN} alt="" className={`size-full ${moving ? "" : "bob"}`} />
        </motion.div>
        <motion.div aria-hidden className="pointer-events-none absolute left-0 top-0 -ml-6 -mt-6 grid size-12 origin-bottom place-items-center rounded-2xl border-[3px] border-ink bg-cream"
          style={{ x: tx, y: ty, scaleY: tsy, rotate: trot, opacity: top }}>
          <Stamp className="size-7" strokeWidth={2.5} />
        </motion.div>
      </div>

      <p aria-live="polite" className="mt-6 min-h-[3.2em] max-w-3xl text-pretty text-lg font-bold">{SAY[beat]}</p>
    </MotionConfig>
  );
}
