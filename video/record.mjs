// Records the real flow on the running app for the rough cut: landing, sample letter, seal, delivery, desk.
// Usage: node record.mjs [baseUrl]   (reads ADMIN_TOKEN from ../.env for the desk scene)
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const KEY = readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^ADMIN_TOKEN=(.+)$/m)?.[1] ?? "";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (page, text) =>
  page.evaluate((t) => [...document.querySelectorAll("button,a")].find((b) => b.innerText.includes(t))?.click(), text);

const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome-stable", args: ["--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await wait(800);
const rec = await page.screencast({ path: "rough.webm" });

await wait(3500); // the landing: headline and a real delivered letter
await page.evaluate(() => window.scrollTo({ top: 760, behavior: "smooth" }));
await wait(3500); // gift cards vs Cachet
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await wait(1500);

await click(page, "Open a sample letter");
await page.waitForFunction(() => document.body.innerText.includes("Deliver to"));
await wait(2500); // the sealed envelope
await click(page, "Use Cachet's demo wallet");
await wait(1800);
await page.click('button[aria-label^="Break the seal"]');
await page.waitForFunction(() => document.body.innerText.includes("On its way"), { timeout: 30000 });
await page.waitForFunction(() => document.body.innerText.includes("Delivered."), { timeout: 90000 });
await wait(4500); // the delivered letter: block, txid, address deleted

await page.evaluate((k) => sessionStorage.setItem("cachet-desk-key", k), KEY);
await page.goto(`${BASE}/desk`, { waitUntil: "networkidle0" });
await wait(4500); // the organiser's desk: treasury, batches as seals

await rec.stop();
await browser.close();
console.log("wrote rough.webm");
