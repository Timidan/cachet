import type { AddressInfo } from "./devtool";

// zcash-devtool's names for each network, and the prefix a unified address carries on it.
export const NETWORKS = {
  main: { label: "main", prefix: "u1" },
  test: { label: "testnet", prefix: "utest1" },
  regtest: { label: "regtest", prefix: "uregtest1" },
} as const;
export type Network = keyof typeof NETWORKS;

// Addresses are bech32/base58: letters and digits only. Also keeps "-flags" away from the CLI.
export const looksLikeAddress = (s: string) => /^[A-Za-z0-9]{20,2000}$/.test(s);

// Why Cachet won't pay this address, or null if it will.
// zcash-devtool pays transparent addresses in public without complaint, so the refusal has to live here.
export function refusal(info: AddressInfo | null, network: Network): string | null {
  const { label, prefix } = NETWORKS[network];
  if (!info) return "That isn't a Zcash address.";
  if (info.kind.startsWith("Transparent") || info.kind.startsWith("TEX"))
    return "That address is public, so this payment would be too. Paste a shielded address.";
  if (info.network !== label) return `That address is for ${info.network}. This payment is on ${label}.`;
  if (info.kind !== "Unified Address" || !info.receivers.includes("Orchard"))
    return `Paste a unified address (it starts with ${prefix}) from a current wallet such as Zodl.`;
  return null;
}
