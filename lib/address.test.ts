import { expect, test } from "bun:test";
import { parseInspect } from "./devtool";
import { refusal } from "./address";

// Real `zcash-devtool inspect` output, trimmed.
const unified = `Zcash address
 - Network: main
 - Kind: Unified Address
 - Receivers:
   - Orchard (u1c4d08nevj4d9ecq64ny5jlw49k9m4v2q6hteu5vax2hzpdc35c4y5hm65fzx80stk53vgxvwrsx3rxsvqeenqw63czgq2shm7g5530ej)
   - Sapling (zs148fkmfty9mu96h4zyrnyn9nuscmmyg0r2qpcv8p6047x93p88sfwhmywyavlmllp7jccsnvy4rn)
   - Transparent P2PKH (t1eH9B5q2Uyz3CpsekBYS7w64G7s6WTbxEt)`;
const transparent = `Zcash address
 - Network: main
 - Kind: Transparent P2PKH`;

test("pays a unified address with a shielded receiver", () => {
  expect(refusal(parseInspect(unified), "main")).toBeNull();
});

test("refuses a transparent address, which zcash-devtool would pay in public", () => {
  expect(refusal(parseInspect(transparent), "main")).toContain("public");
});
