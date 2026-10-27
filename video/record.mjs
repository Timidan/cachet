// Records the demo film from the real app, one clip per scene. puppeteer-capture renders every frame on demand,
// so motion is a smooth 60 fps however slow the machine is. Real waits (the signer and the block) are skipped.
// Each scene's screen is a panel in a dark space: it flies in, the camera pushes in on what matters, and it leaves,
// so the clips join on a dark frame.
// Usage: node record.mjs [dpr]   1 = a quick 1920x1080 preview, 2 = the 3840x2160 master (default). Then ./edit.sh.
// Starts its own Cachet server on a fresh data dir: stop any other server using the regtest wallets first.
import { execFileSync, spawn } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { capture, launch } from "puppeteer-capture";

const DPR = Number(process.argv[2] ?? 2);
const ROOT = new URL("../", import.meta.url).pathname;
const OUT = `${ROOT}video/out/${DPR}x`;
const BASE = "http://127.0.0.1:3100";
const ENV = Object.fromEntries(readFileSync(`${ROOT}.env`, "utf8").split("\n").map((l) => l.split(/=(.*)/s)).filter((p) => p.length > 1));
const DEVTOOL = `${ROOT}vendor/zcash-devtool/target/release/zcash-devtool`;
const RECIPIENT = `${ROOT}wallet-regtest-recipient`; // the winner in this film: a test wallet on the regtest chain
const T_ADDR = "tmHhZaZi6s8oPwXC4URjQvLWkT1P68bFhSE"; // the same wallet's transparent address
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const devtool = (...args) => execFileSync(DEVTOOL, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const UA = devtool("wallet", "-w", RECIPIENT, "list-addresses").match(/Default Address: (\S+)/)[1];
// Long values are cut in the middle on screen; every card that does this says "trimmed".
const shortHex = (s) => s.replace(/\b([0-9a-f]{12})[0-9a-f]{40,}([0-9a-f]{8})\b/g, "$1…$2");
const shortAddr = (s) => s.replace(/\b(u(?:regtest|test)?1[0-9a-z]{10})[0-9a-z]{30,}([0-9a-z]{6})\b/g, "$1…$2");

rmSync(`${OUT}/data`, { recursive: true, force: true });
const server = spawn("bun", ["server.ts"], {
  cwd: ROOT,
  stdio: ["ignore", "ignore", "inherit"],
  // No REGTEST_RPC: the server mines nothing, so the payout waits for the block the recorder mines on cue.
  env: { ...process.env, PORT: "3100", DATA_DIR: `${OUT}/data`, PUBLIC_URL: "https://cachet.timidan.xyz", REGTEST_RPC: "" },
});
process.on("exit", () => server.kill());
const rpc = (method, params) => fetch(ENV.REGTEST_RPC, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
}).then((r) => r.json());
for (let i = 0; !(await fetch(`${BASE}/api/health`).then((r) => r.ok, () => false)); i++) {
  if (i > 100) throw new Error("the server didn't start");
  await sleep(100);
}

// The organiser's signer, run for real and answered "y", as the organiser would at their own terminal.
function runSigner() {
  return new Promise((resolve, reject) => {
    const p = spawn("bun", ["signer.ts"], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "inherit"],
      env: { ...process.env, CACHET_URL: BASE, SIGNER_WALLET: "wallet-regtest" },
    });
    let out = "";
    let answered = false;
    p.stdout.on("data", (d) => {
      out += d;
      if (/Sign this payout\?/.test(out) && !answered) { answered = true; p.stdin.write("y\n"); }
      if (/Signed and sent: [0-9a-f]{64}|Not sent:/.test(out)) { p.kill(); resolve(out); }
    });
    p.on("exit", (code) => code && reject(new Error(`signer exited with ${code}: ${out}`)));
  });
}

const browser = await launch({
  executablePath: `${process.env.HOME}/.cache/puppeteer/chrome-headless-shell/linux-150.0.7871.24/chrome-headless-shell-linux64/chrome-headless-shell`,
  // beginFrame screenshots ignore emulated device metrics, so the pixel density comes from the window itself.
  args: ["--window-size=1920,1080", `--force-device-scale-factor=${DPR}`, "--hide-scrollbars", "--font-render-hinting=none"],
  defaultViewport: null,
});
await browser.defaultBrowserContext().overridePermissions(BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.evaluateOnNewDocument((k) => { try { sessionStorage.setItem("cachet-access-key", k); } catch {} }, ENV.ADMIN_TOKEN);
const rec = await capture(page, {
  fps: 60,
  // Lossless clips: edit.sh makes the one lossy encode.
  format: async (ff) => void ff.outputFormat("matroska").videoCodec("libx264rgb").outputOptions(["-qp 0", "-preset ultrafast"]),
});
const hold = (ms) => rec.waitForTimeout(ms);
const inPage = (fn, ...args) => page.evaluate(fn, ...args);
async function until(fn, ...args) { // polls in real time while frames keep rendering
  for (let i = 0; !(await page.evaluate(fn, ...args)); i++) {
    if (i > 3000) throw new Error(`timed out waiting for ${fn}`);
    await sleep(100);
  }
}
// The capture's time script restarts with every recording, so the film's animation clock is re-armed each time.
async function start(file) {
  await rec.start(file, { dropCapturedFrames: true });
  await inPage(() => film.arm());
}

// The film's own layer: a dark space the screens float in, captions, a pointer, title cards and a test-network tag.
// It moves only with CSS transitions and keyframes; film.arm() drives every animation on the page from the recorder's
// clock, because the browser's own animation clock drifts from it in this capture mode.
function installFilm({ zoom, chip, panel }) {
  const ease = "cubic-bezier(0.22, 1, 0.36, 1)"; // the app's easing, so the film moves like the product
  if (panel === "body") document.getElementById("root").style.zoom = String(zoom);
  document.documentElement.classList.add("film");
  if (panel === "body") document.documentElement.classList.add("film-body");
  const el = document.createElement("div");
  el.id = "film";
  el.innerHTML = `<style>
    html.film { background: radial-gradient(ellipse 80% 70% at 50% 45%, #2b2412 0%, #121212 70%) !important; overflow: clip; }
    html.film:not(.film-body) body { visibility: hidden; } /* title cards: the page underneath stays out of the shot */
    html.film-body body, #film .stage {
      transform-origin: var(--ox, 50%) var(--oy, 50%);
      transition: transform var(--pt, 0ms) var(--pe, ease), border-radius var(--pt, 0ms) var(--pe, ease),
        opacity var(--po, 0ms) ease, filter 0.6s ${ease}; }
    html.film-body body { height: 100vh; overflow: auto; margin: 0; background: oklch(0.839 0.167 87.578);
      box-shadow: 0 50px 140px rgba(0, 0, 0, 0.55); }
    #film { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; color: #111;
      font-family: "Nunito Variable", Nunito, sans-serif; font-weight: 700; }
    #film .beat { position: absolute; left: 0; top: 0; width: 2px; height: 2px; background: #111; animation: beat 1s linear infinite; }
    @keyframes beat { from { opacity: 0.011 } to { opacity: 0.012 } }
    #film .chip { position: absolute; left: 24px; top: 22px; padding: 5px 14px; border: 2px solid #111; border-radius: 999px;
      background: oklch(0.993 0.011 95.159); font-size: 17px; font-weight: 800; }
    #film .say { position: absolute; left: 50%; bottom: 48px; width: max-content; max-width: 1160px; padding: 18px 30px;
      border-radius: 24px; background: #111; color: #fff; font-size: 34px; font-weight: 800; line-height: 1.25;
      text-align: center; text-wrap: balance; box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.22);
      opacity: 0; transform: translate(-50%, 10px) scale(0.97); transition: opacity 0.3s ${ease}, transform 0.45s ${ease}; }
    #film .say.on { opacity: 1; transform: translate(-50%, 0); }
    #film .say.left { left: 64px; bottom: auto; top: 50%; max-width: 470px; text-align: left; transform: translate(0, calc(-50% + 10px)) scale(0.97); }
    #film .say.left.on { transform: translate(0, -50%); }
    #film .say .w { display: inline-block; opacity: 0; transform: translateY(14px);
      transition: opacity 0.35s ${ease}, transform 0.5s ${ease}; transition-delay: calc(var(--i) * 30ms); }
    #film .say.on .w { opacity: 1; transform: none; }
    #film .cx { position: absolute; left: 0; top: 0; transform: translateX(var(--x, 2050px));
      transition: transform var(--t, 0s) cubic-bezier(0.45, 0, 0.2, 1); }
    #film .cy { transform: translateY(var(--y, 760px)); transition: transform var(--t, 0s) cubic-bezier(0.3, 0, 0.5, 1); }
    #film .ptr { display: block; width: 30px; transform-origin: 3px 2px; transition: transform 0.09s ease-out;
      filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.3)); }
    #film .pressed .ptr { transform: scale(0.82); }
    #film .ring { position: absolute; width: 60px; height: 60px; margin: -30px 0 0 -30px; border: 3px solid #111; border-radius: 50%; opacity: 0; }
    #film .ring.go { animation: ring 0.55s ${ease} forwards; }
    @keyframes ring { from { opacity: 0.55; transform: scale(0.3) } to { opacity: 0; transform: scale(1.15) } }
    #film .stage { position: absolute; inset: 0; display: grid; place-items: center; background: oklch(0.839 0.167 87.578);
      box-shadow: 0 50px 140px rgba(0, 0, 0, 0.55); }
    #film .stage.clear { background: none; box-shadow: none; }
    #film .pop { opacity: 0; transform: translateY(26px); transition: opacity 0.5s ${ease}, transform 0.6s ${ease}; }
    #film .pop.in { opacity: 1; transform: none; }
    #film .swing { opacity: 0; transform: perspective(1400px) translateX(180px) rotateY(-26deg) scale(0.94);
      transition: opacity 0.4s ${ease}, transform 0.95s cubic-bezier(0.2, 1.12, 0.35, 1); }
    #film .swing.in { opacity: 1; transform: none; }
    #film .swing.gone { opacity: 0; transform: perspective(1400px) translateX(-160px) rotateY(22deg) scale(0.94);
      transition: opacity 0.4s ease-in, transform 0.55s cubic-bezier(0.55, 0, 0.75, 0.3); }
    #film .grp { transition: opacity 0.35s ${ease}, transform 0.35s ${ease}; }
    #film .grp.out { opacity: 0; transform: translateY(-14px); }
    #film .sticker { font-family: "Lilita One", sans-serif; font-weight: 400; -webkit-text-stroke: 0.15em #fff; paint-order: stroke fill;
      text-shadow: 0 0.07em 0 rgba(0, 0, 0, 0.18); }
    #film .coin { opacity: 0; }
    #film .coin.in { animation: coin 0.75s ${ease} forwards; }
    @keyframes coin { 0% { opacity: 0; transform: scale(0.4) rotate(-16deg) } 50% { opacity: 1; transform: scale(1.12, 0.9) rotate(4deg) }
      72% { transform: scale(0.95, 1.05) rotate(-1deg) } 100% { opacity: 1; transform: none } }
    #film .land { opacity: 0; transform: scale(0.86); }
    #film .land.in { animation: land 0.6s ${ease} forwards; }
    @keyframes land { 0% { opacity: 0; transform: scale(0.86) } 60% { opacity: 1; transform: scale(1.04, 0.97) } 100% { opacity: 1; transform: none } }
    #film .rows { display: grid; gap: 16px; width: 760px; margin: 44px auto 0; }
    #film .rowh, #film .rowx { display: grid; grid-template-columns: 230px 1fr; gap: 20px; }
    #film .rowh { font-size: 20px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; color: oklch(0.396 0.027 87.152); }
    #film .rowx { opacity: 0; transform: translateX(-36px); transition: opacity 0.4s ${ease}, transform 0.55s ${ease}; }
    #film .rowx.in { opacity: 1; transform: none; }
    #film .rowx i, #film .rowx b { height: 32px; border-radius: 10px; background: #111; }
    #film .rowx i { opacity: 0.8; } #film .rowx b { opacity: 0.32; }
    #film .rowx.fall, #film .rowh.fall { animation: fall 0.95s cubic-bezier(0.55, 0, 0.8, 0.25) forwards; animation-delay: calc(var(--i) * 70ms); }
    @keyframes fall { 0% { opacity: 1; transform: none } 14% { opacity: 1; transform: translateY(-10px) rotate(calc(var(--r) * -0.2)) }
      100% { opacity: 0; transform: translateY(640px) rotate(var(--r)) } }
    #film .term { box-sizing: border-box; padding: 26px 30px 30px; border: 3px solid #111; border-radius: 28px;
      background: #111; color: oklch(0.993 0.011 95.159); box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
      font-family: "DM Mono", monospace; line-height: 1.6; }
    #film .term .head { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 12px; color: oklch(0.839 0.167 87.578); }
    #film .term .head i { font-style: normal; color: oklch(0.7 0.02 90); }
    #film .term .ln { display: block; white-space: pre; margin: 0 -12px; padding: 0 12px; border-radius: 8px; opacity: 0;
      transition: background-color 0.5s ${ease}; }
    #film .term .ln.in { opacity: 1; }
    #film .term .ln.lit { background-color: oklch(0.839 0.167 87.578 / 0.26); }
  </style>
  <div class="beat"></div>
  <div class="stagehost"></div>
  ${chip ? `<div class="chip">Recorded on Cachet's test network</div>` : ""}
  <div class="say"></div>
  <div class="ring"></div>
  <div class="cx"><div class="cy"><svg class="ptr" viewBox="0 0 30 40" aria-hidden="true">
    <path d="M3 2 L3 32 L10.5 25 L15.5 37 L21 34.6 L16 23 L26 23 Z" fill="#111" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
  </svg></div></div>`;
  document.documentElement.append(el);
  const $ = (s) => el.querySelector(s);
  const make = (tag, props) => Object.assign(document.createElement(tag), props);
  let at = { x: 2050, y: 760 };
  let generation = 0;
  // A screen's poses in the dark space. Entering decelerates with a touch of overshoot; leaving accelerates away.
  // The perspective lives in each transform: a perspective property on <html> would capture the fixed overlay.
  const POSES = {
    enter: { t: "perspective(1800px) translate3d(0, 90px, 0) scale(0.78) rotateX(18deg) rotateY(-12deg)", r: "32px", o: "0", e: "cubic-bezier(0.16, 1, 0.3, 1)" },
    rest: { t: "none", r: "0px", o: "1", e: "cubic-bezier(0.22, 1.06, 0.36, 1)" },
    recede: { t: "perspective(1800px) translate3d(-90px, 10px, 0) scale(0.86) rotateY(12deg)", r: "28px", o: "1", f: "brightness(0.5)", e: "cubic-bezier(0.65, 0, 0.35, 1)" },
    exit: { t: "perspective(1800px) translate3d(-40px, 50px, 0) scale(0.84) rotateY(10deg) rotateX(6deg)", r: "28px", o: "0", e: "cubic-bezier(0.55, 0, 0.75, 0.25)" },
  };
  const screen = () => (panel === "body" ? document.body : $(".stage"));
  window.film = {
    // Every frame, set each animation's time from the page's (recorder-driven) clock. Setting it also makes the
    // browser redraw the page each frame, which this capture mode otherwise skips for compositor-only animations.
    arm() {
      const g = ++generation;
      const started = new WeakMap();
      const tick = () => {
        if (g !== generation) return;
        const now = performance.now();
        for (const a of document.getAnimations()) {
          if (!started.has(a)) started.set(a, now - (a.currentTime ?? 0));
          a.currentTime = now - started.get(a);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    pose(name, ms = 0) {
      const s = screen();
      const p = POSES[name];
      if (getComputedStyle(s).transform === "none") { s.style.setProperty("--ox", "50%"); s.style.setProperty("--oy", "50%"); }
      s.style.setProperty("--pt", `${ms}ms`);
      s.style.setProperty("--pe", p.e);
      s.style.setProperty("--po", `${name === "exit" ? ms : Math.min(ms, 350)}ms`);
      Object.assign(s.style, { transform: p.t, borderRadius: p.r, opacity: p.o, filter: p.f ?? "none" });
    },
    // A camera push towards a point (viewport pixels); scale 1 pulls back. Slow in and slow out, like a dolly.
    camera(x, y, scale, ms) {
      const s = screen();
      if (scale !== 1) { s.style.setProperty("--ox", `${x}px`); s.style.setProperty("--oy", `${y}px`); }
      s.style.setProperty("--pt", `${ms}ms`);
      s.style.setProperty("--pe", "cubic-bezier(0.65, 0, 0.35, 1)");
      s.style.transform = scale === 1 ? "none" : `scale(${scale})`;
    },
    say(text, side = "bottom") {
      const s = $(".say");
      if (!text) return s.classList.remove("on");
      s.replaceChildren();
      text.split(" ").forEach((w, i) => s.append(make("span", { className: "w", textContent: w, style: `--i:${i}` }), " "));
      s.className = `say ${side}`;
      void s.offsetWidth;
      s.classList.add("on");
    },
    stage(html, clear = false) { $(".stagehost").innerHTML = `<div class="stage${clear ? " clear" : ""}">${html}</div>`; },
    show(selector, cls = "in", on = true) { el.querySelectorAll(selector).forEach((e) => e.classList.toggle(cls, on)); },
    // Two transitions with different curves on x and y make the pointer travel on an arc, like a hand moving a mouse.
    move(x, y) {
      const ms = Math.round(Math.min(950, 380 + Math.hypot(x - at.x, y - at.y) * 0.45));
      for (const e of [$(".cx"), $(".cy")]) e.style.setProperty("--t", `${ms}ms`);
      $(".cx").style.setProperty("--x", `${x}px`);
      $(".cy").style.setProperty("--y", `${y}px`);
      at = { x, y };
      return ms;
    },
    press(down) {
      $(".cx").classList.toggle("pressed", down);
      if (!down) return;
      const r = $(".ring");
      r.classList.remove("go");
      void r.offsetWidth;
      Object.assign(r.style, { left: `${at.x}px`, top: `${at.y}px` });
      r.classList.add("go");
    },
    // Terminal cards for real command output, built with textContent so the output shows exactly as printed.
    terms(cards, { size = 22, clear = false } = {}) {
      const row = make("div", {});
      Object.assign(row.style, { display: "flex", gap: "48px", alignItems: "flex-start", marginBottom: "110px" });
      cards.forEach((c, i) => {
        const col = make("div", { className: `swing col${i}` });
        col.style.transitionDelay = `${i * 120}ms`;
        const h = make("div", { className: "sticker", textContent: c.title });
        Object.assign(h.style, { fontSize: "50px", margin: "0 0 18px 6px" });
        const term = make("div", { className: `term term${i}` });
        Object.assign(term.style, { width: `${c.width ?? 860}px`, fontSize: `${size}px` });
        const head = make("div", { className: "head" });
        head.append(make("span", { textContent: `$ ${c.cmd}` }), make("i", { textContent: "trimmed" }));
        term.append(head);
        col.append(h, term);
        row.append(col);
      });
      const stage = make("div", { className: `stage${clear ? " clear" : ""}` });
      stage.append(row);
      $(".stagehost").replaceChildren(stage);
      cards.forEach((c, i) => film.lines(i, c.lines ?? []));
    },
    lines(i, lines) {
      const term = $(`.term${i}`);
      const first = term.querySelectorAll(".ln").length;
      lines.forEach((l, j) => term.append(make("span", { className: `ln c${i}l${first + j}${l.hl ? ` hl${i}` : ""}`, textContent: l.t || " " })));
    },
  };
}

let saying = false;
async function say(text, side = "bottom") {
  if (saying) {
    await inPage(() => film.say(null));
    await hold(280);
  }
  await inPage((t, s) => film.say(t, s), text, side);
  saying = true;
  await hold(500);
}
const find = (fn, arg) => page.evaluateHandle(fn, arg).then((h) => h.asElement());
const field = (label) => find((t) => [...document.querySelectorAll("label")].find((l) => l.textContent.trim().startsWith(t))?.querySelector("input"), label);
const button = (text) => find((t) => [...document.querySelectorAll("button, a")].find((b) => b.textContent.trim().startsWith(t)), text);
async function center(target) {
  const el = typeof target === "string" ? await page.$(target) : target;
  const box = await el.boundingBox();
  return [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)];
}
async function moveTo(x, y) {
  await hold((await inPage((x, y) => film.move(x, y), x, y)) + 60);
  await page.mouse.move(x, y); // the real hover lands when the pointer does
}
async function click(target, dx = 0, dy = 0) {
  const [x, y] = await center(target);
  await moveTo(x + dx, y + dy);
  await hold(150); // settle before the press
  await inPage(() => film.press(true));
  await page.mouse.down();
  await hold(110);
  await page.mouse.up();
  await inPage(() => film.press(false));
  await hold(200);
}
async function push(target, scale, ms) {
  const [x, y] = target ? await center(target) : [0, 0];
  await inPage((x, y, s, ms) => film.camera(x, y, s, ms), x, y, scale, ms);
}
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
async function type(text) {
  for (const ch of text) {
    await page.keyboard.type(ch);
    await hold(45 + Math.round(rand() * 60));
  }
}
const paste = (text) => inPage((t) => document.execCommand("insertText", false, t), text);
async function reveal(card, count, ms) {
  for (let j = 0; j < count; j++) {
    await inPage((s) => film.show(s), `.c${card}l${j}`);
    await hold(ms);
  }
}

async function scene(name, path, { zoom = 1, chip = true, panel = "body", exit = true, ready = () => true, setup } = {}, body) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await inPage(installFilm, { zoom, chip, panel });
  if (setup) await setup();
  await inPage(() => film.pose("enter"));
  await start(`${OUT}/${name}.mkv`);
  await until(ready);
  await until(() => document.fonts.status === "loaded" && [...document.images].every((i) => i.complete));
  await hold(100);
  rec.dropCapturedFrames = false;
  saying = false;
  await hold(150);
  await inPage(() => film.pose("rest", 950));
  await body();
  if (exit) {
    await inPage(() => film.say(null));
    await inPage(() => film.pose("exit", 600));
    await hold(700);
  }
  await rec.stop();
  console.log(`${name}: ${(rec.recordedFrames / 60).toFixed(1)} s`);
}

// Title cards hide the page they sit on; this one has no lazy iframe (the landing page has, and the recorder would
// wait on it forever).
const CANVAS = "/c/film-canvas-0000000000";
const BRAND = `<div class="brand" style="display:flex; align-items:center; gap:28px">
    <img class="coin" src="/art/play/coin.webp" alt="" style="width:150px; height:150px">
    <span class="sticker pop word" style="font-size:150px; line-height:1">Cachet</span></div>
  <p class="pop lead" style="margin:26px 0 0; font-size:52px; font-weight:800; text-align:center">Pay anyone with a link.</p>`;
// An abstract roster: bars, not names, because the point is its shape.
const ROWS = `<div class="rows"><div class="rowh pop" style="--i:0; --r:-6deg"><span>Name</span><span>Zcash address</span></div>
  ${[["74%", "92%"], ["58%", "86%"], ["81%", "95%"], ["66%", "89%"], ["70%", "93%"]].map(([a, b], i) =>
    `<div class="rowx" style="--i:${i + 1}; --r:${i % 2 ? 9 : -11}deg"><i style="width:${a}"></i><b style="width:${b}"></b></div>`).join("")}</div>`;

try {
  // The brand, then the problem it removes: a roster builds up, outlives the payment, and falls away.
  await scene("open", CANVAS, {
    chip: false,
    panel: "stage",
    setup: () => inPage((b, rows) => film.stage(`<div style="display:grid; place-items:center">
      <div class="grp a" style="grid-area:1/1; display:flex; flex-direction:column; align-items:center">${b}</div>
      <div class="grp b" style="grid-area:1/1; width:1240px; text-align:center">
        <p class="pop p1" style="margin:0; font-size:54px; font-weight:800; line-height:1.2; text-wrap:balance">Paying winners usually starts with a list of their names and addresses.</p>
        <div style="display:grid; place-items:center; min-height:330px">
          <div style="grid-area:1/1">${rows}</div>
          <p class="land p3 sticker" style="grid-area:1/1; margin:0; font-size:110px; line-height:1">Cachet never makes one.</p></div>
        <p class="pop p2" style="margin:26px 0 0; font-size:54px; font-weight:800">That list outlives the payment.</p></div></div>`), BRAND, ROWS),
  }, async () => {
    await hold(350);
    await inPage(() => film.show(".coin"));
    await hold(160);
    await inPage(() => film.show(".word"));
    await hold(400);
    await inPage(() => film.show(".lead"));
    await hold(1900);
    await inPage(() => film.show(".a", "out"));
    await hold(380);
    await inPage(() => film.show(".p1"));
    await hold(350);
    await inPage(() => film.show(".rowh"));
    for (let i = 1; i <= 5; i++) {
      await inPage((i) => film.show(`.rowx:nth-child(${i + 1})`), i);
      await hold(110);
    }
    await hold(500);
    await inPage(() => film.show(".p2"));
    await hold(1300);
    await inPage(() => film.show(".rowh, .rowx", "fall"));
    await hold(520);
    await inPage(() => film.show(".p3"));
    await hold(2100);
  });

  // The organiser: a treasury Cachet can see but not spend, then three links.
  let links;
  await scene("dash", "/dashboard", {
    zoom: 1.1,
    ready: () => /Treasury balance/i.test(document.body.innerText) && /No payout links yet/.test(document.body.innerText),
  }, async () => {
    await hold(700);
    await say("Say Zecathon pays its winners with Cachet.");
    await hold(1100);
    const audit = await find(() => [...document.querySelectorAll("p")].find((p) => p.textContent.trim() === "Audit key")?.parentElement);
    await push(audit, 1.35, 1100);
    await hold(500);
    await say("Cachet runs on the treasury's viewing key. It can see the treasury, but it can't spend.");
    await hold(2300);
    await push(null, 1, 900);
    await hold(400);
    await inPage(() => document.querySelector("form").scrollIntoView({ behavior: "smooth", block: "start" }));
    await say("One link per winner. Nothing moves on-chain until a link is claimed.");
    await hold(250);
    await click(await field("Name"));
    await type("Zecathon winners");
    await hold(200);
    await click(await field("From"));
    await type("Zecathon");
    await hold(200);
    await click(await field("Message"));
    await type("Congrats on your prize");
    await hold(300);
    await click(await field("ZEC per link"));
    await inPage(() => document.activeElement.select());
    await type("1.5");
    await hold(200);
    await click(await field("Links"));
    await inPage(() => document.activeElement.select());
    await type("3");
    await hold(800);
    await click(await button("Create 3 links"));
    await until(() => /Your links are ready/.test(document.body.innerText));
    links = await page.$$eval("ol li", (lis) => lis.map((l) => l.textContent));
    await hold(300);
    const fresh = await find(() => [...document.querySelectorAll("section")].find((s) => /Your links are ready/.test(s.textContent)));
    await push(fresh, 1.25, 1000);
    await hold(600);
    await say("Cachet keeps only a fingerprint of each link, so it can't show them again.");
    await click(await button("Copy all"));
    await hold(2200);
  });

  // The winner claims: a transparent address is refused, a shielded one waits for the organiser's key.
  const token = links[0].split("/c/")[1];
  let txid;
  await scene("claim", `/c/${token}`, { zoom: 1.3, ready: () => !!document.querySelector("#address") }, async () => {
    await hold(700);
    await say("The winner opens their link. No account, no form.", "left");
    await hold(1300);
    await click("#address");
    await paste(T_ADDR);
    await hold(600);
    await click('button[type="submit"]');
    await until(() => !!document.querySelector("#address-error"));
    await push("#address-error", 1.22, 900);
    await hold(400);
    await say("A transparent address would make the payment public. Cachet refuses it.", "left");
    await hold(2400);
    await push(null, 1, 800);
    await hold(500);
    await click("#address", -120);
    await inPage(() => document.activeElement.select());
    await paste(UA);
    await hold(700);
    await click('button[type="submit"]');
    await moveTo(1500, 990); // out of the receipt's way
    await until(() => /Claimed/.test(document.body.innerText));
    await hold(700);
    await say("Claimed. Now the organiser approves it with their own key.", "left");
    await hold(2000);

    // The organiser's signer swings in front of the page, which recedes (and keeps polling) behind it.
    await inPage(() => film.say(null));
    saying = false;
    await inPage(() => film.terms([{ title: "The organiser's signer", cmd: "bun signer.ts", width: 1180 }], { size: 24, clear: true }));
    await inPage(() => film.pose("recede", 800));
    await hold(200);
    await inPage(() => film.show(".col0"));
    await hold(700);
    await say("Cachet builds the payout as a PCZT. The signer reads it and signs with the organiser's key.");
    rec.dropCapturedFrames = true; // the signer and Cachet's proof take real seconds
    const out = await runSigner();
    txid = out.match(/Signed and sent: ([0-9a-f]{64})/)[1];
    const lines = out.split("\n").map((l) => l.trimEnd())
      .filter((l) => l && !/^Signing Cachet payouts/.test(l))
      .flatMap((l) => l.replace(/^(Sign this payout\? \[y\/N\])\s*/, "$1 y\n").split("\n"))
      .map((t) => ({ t: shortHex(shortAddr(t)), hl: /zatoshis to u|^Signed and sent/.test(t) }));
    await inPage((l) => film.lines(0, l), lines);
    rec.dropCapturedFrames = false;
    await reveal(0, lines.length, 70);
    await hold(300);
    await inPage(() => film.show(".hl0", "lit"));
    await hold(2300);
    await say("Cachet never holds that key. It only ever had the viewing key.");
    await hold(2100);
    await inPage(() => { film.say(null); film.show(".col0", "gone"); film.pose("rest", 900); });
    saying = false;
    await until(() => /Sending/.test(document.body.innerText));
    await hold(900);
    await say("Sent privately, with the message as an encrypted memo.", "left");
    await hold(1400);
    await say("Waiting for the next block (sped up)", "left");
    await hold(1100);
    // The block and Cachet's check of it take real seconds; don't film them.
    rec.dropCapturedFrames = true;
    await rpc("generate", [1]);
    for (;;) {
      const l = await (await fetch(`${BASE}/api/link/${token}`)).json();
      if (l.status === "delivered") break;
      await sleep(200);
    }
    rec.dropCapturedFrames = false;
    await until(() => /Received/.test(document.body.innerText));
    await hold(700);
    await push("article", 1.12, 2600);
    await say("Received. Cachet deleted the address as soon as the block confirmed it.", "left");
    await hold(3200);
  });

  // The cold open: the same receipt, drifting closer, for the film's first seconds.
  await start(`${OUT}/coldopen.mkv`);
  await inPage(() => { film.pose("rest"); film.move(2050, 760); film.say("Paid in private, by link. The address is already deleted.", "left"); });
  await push("article", 1.1, 0);
  await hold(600);
  rec.dropCapturedFrames = false;
  await push("article", 1.18, 5000);
  await hold(4700);
  await inPage(() => { film.say(null); film.pose("exit", 600); });
  await hold(700);
  await rec.stop();
  console.log(`coldopen: ${(rec.recordedFrames / 60).toFixed(1)} s`);

  // Proof from outside Cachet: the winner's wallet, the organiser's audit key, and the node.
  const entry = (listing) => listing.slice(listing.indexOf(txid)).split(/\n(?=[0-9a-f]{64}\n)/)[0].split("\n")
    .filter((l) => l.trim() && !/Received by account|Sent from account|^\s+To:|Fee paid/.test(l))
    .map((l) => shortHex(l.replace(/ \(\d{4}-\d\d-\d\d [^)]*\)/, ""))); // regtest block times read 2011
  devtool("wallet", "-w", RECIPIENT, "sync", "-s", ENV.LWD_SERVER);
  devtool("wallet", "-w", RECIPIENT, "enhance", "-s", ENV.LWD_SERVER);
  const winner = entry(devtool("wallet", "-w", RECIPIENT, "list-tx")).map((t) => ({ t, hl: /Memo::Text/.test(t) }));
  // The accountant's wallet: made from the audit key the dashboard copies, and nothing else.
  const { auditKey } = await (await fetch(`${BASE}/api/admin/treasury`, { headers: { authorization: `Bearer ${ENV.ADMIN_TOKEN}` } })).json();
  const ACCOUNTANT = `${OUT}/accountant`;
  rmSync(ACCOUNTANT, { recursive: true, force: true });
  devtool("wallet", "-w", ACCOUNTANT, "init-fvk", "--name", "accountant", "--fvk", auditKey, "--birthday", "6", "-s", ENV.LWD_SERVER);
  const heights = readFileSync(`${ROOT}wallet-regtest/keys.toml`, "utf8").match(/\[activation_heights\][\s\S]*/)[0];
  const keys = readFileSync(`${ACCOUNTANT}/keys.toml`, "utf8");
  writeFileSync(`${ACCOUNTANT}/keys.toml`, keys.replace(/\[activation_heights\][\s\S]*/, heights)); // init-fvk assumes default regtest heights
  devtool("wallet", "-w", ACCOUNTANT, "sync", "-s", ENV.LWD_SERVER);
  devtool("wallet", "-w", ACCOUNTANT, "enhance", "-s", ENV.LWD_SERVER);
  const audit = entry(devtool("wallet", "-w", ACCOUNTANT, "list-tx")).map((t) => ({ t, hl: /0 memos/.test(t) }));
  const raw = await (await fetch(ENV.REGTEST_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getrawtransaction", params: [txid, 1] }),
  })).text();
  const JQ = ".result | {vin, vout, vShieldedSpend, vShieldedOutput, orchard: {actions: (.orchard.actions | length)}, ironwood: {actions: (.ironwood.actions | length), valueBalance: .ironwood.valueBalance}}";
  const chain = execFileSync("jq", [JQ], { encoding: "utf8", input: raw }).trimEnd().split("\n").map((t) => ({ t, hl: /"(vin|vout|valueBalance)"/.test(t) }));
  const CARDS = [
    { title: "The winner's wallet", cmd: "zcash-devtool wallet list-tx", lines: winner, width: 1180,
      say: "Only the winner's wallet can read who was paid and the memo." },
    { title: "Your audit key", cmd: "zcash-devtool wallet list-tx", lines: audit, width: 1180,
      say: "Your audit key sees the amount that left, not who received it." },
    { title: "The Zcash node", cmd: `getrawtransaction ${txid.slice(0, 8)}… 1 | jq`, lines: chain, width: 1000,
      say: "On-chain: no transparent inputs or outputs. The only public number is the fee." },
  ];
  await scene("proof", CANVAS, { panel: "stage", setup: () => inPage((c) => film.terms([c], { size: 27 }), CARDS[0]) }, async () => {
    await hold(400);
    for (const [k, card] of CARDS.entries()) {
      if (k) {
        await inPage(() => { film.say(null); film.show(".col0", "gone"); });
        saying = false;
        await hold(500);
        // A new stage at rest: the old one only differed by the camera, and its card has already swung away.
        await inPage((c) => film.terms([c], { size: 27 }), card);
      }
      await say(card.say);
      await inPage(() => film.show(".col0"));
      await hold(600);
      await push(".term0", 1.06, 4200);
      await reveal(0, card.lines.length, k === 2 ? 45 : 60);
      await inPage(() => film.show(".hl0", "lit"));
      await hold(k === 2 ? 2600 : 2200);
    }
  });

  // Back in the dashboard: one paid, two waiting.
  await scene("paid", "/dashboard", {
    zoom: 1.1,
    ready: () => /Treasury balance/i.test(document.body.innerText) && /1 paid/i.test(document.body.innerText),
  }, async () => {
    await hold(800);
    const batch = await find(() => [...document.querySelectorAll("article")].find((a) => /Zecathon winners/.test(a.textContent)));
    await push(batch, 1.3, 1200);
    await say("Unclaimed links expire, and their ZEC never leaves the treasury.");
    await hold(3400);
  });

  // The end card stays on screen: the live demo and the code.
  await scene("end", CANVAS, {
    chip: false,
    panel: "stage",
    exit: false,
    setup: () => inPage((b) => film.stage(`<div style="display:flex; flex-direction:column; align-items:center">${b}
      <div class="pop urls" style="margin-top:60px; font-size:44px; font-weight:800; line-height:1.5; text-align:center">
        <div>Try it: cachet.timidan.xyz</div><div>Code: github.com/Timidan/cachet</div></div>
      <p class="pop tech" style="margin:44px 0 0; font-family:'DM Mono', monospace; font-size:27px">Ironwood · encrypted memos · PCZT signing · viewing keys</p>
      <p class="pop note" style="margin:18px 0 0; font-size:26px; font-weight:700">Recorded on Cachet's test network · Built for Zecathon 2026, Shielded Payments</p></div>`), BRAND),
  }, async () => {
    await hold(350);
    await inPage(() => film.show(".coin"));
    await hold(160);
    await inPage(() => film.show(".word"));
    await hold(400);
    await inPage(() => film.show(".lead"));
    await hold(650);
    await inPage(() => film.show(".urls"));
    await hold(420);
    await inPage(() => film.show(".tech"));
    await hold(320);
    await inPage(() => film.show(".note"));
    await hold(4800);
  });
} finally {
  await browser.close();
  server.kill();
}
