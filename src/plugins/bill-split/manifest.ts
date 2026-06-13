import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "bill-split",
  name: "Bill Splitter",
  description: "Split a bill with tip across people — see what each owes.",
  category: "Utilities",
  icon: "Wallet",
  route: "/p/bill-split",
  tags: ["split", "tip", "money", "chia tiền", "hóa đơn", "tiền boa"],
  accent: "from-amber-500 to-orange-600",
};
