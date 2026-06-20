import type { Locale } from "@/core/i18n/locale-store";

/** Word banks for the drawer to pick from. Kept simple & family-friendly. */
const WORDS: Record<Locale, string[]> = {
  vi: [
    "con mèo", "con chó", "ngôi nhà", "mặt trời", "cái cây", "ô tô", "máy bay", "bông hoa",
    "quả táo", "cầu vồng", "con cá", "chiếc thuyền", "đồng hồ", "cái ô", "kính mắt", "bánh kem",
    "con voi", "con bướm", "ngôi sao", "trái tim", "cây kem", "xe đạp", "con rùa", "mặt trăng",
    "cái ghế", "đôi giày", "cây nấm", "con chim", "quả chuối", "cái mũ", "con rắn", "bóng đèn",
    "cây dừa", "con gà", "cái bàn", "chiếc lá", "quả dứa", "con ong", "cái trống", "tàu hỏa",
  ],
  en: [
    "cat", "dog", "house", "sun", "tree", "car", "airplane", "flower",
    "apple", "rainbow", "fish", "boat", "clock", "umbrella", "glasses", "cake",
    "elephant", "butterfly", "star", "heart", "ice cream", "bicycle", "turtle", "moon",
    "chair", "shoe", "mushroom", "bird", "banana", "hat", "snake", "light bulb",
    "palm tree", "chicken", "table", "leaf", "pineapple", "bee", "drum", "train",
  ],
};

/** Normalise for comparison: lowercase, strip diacritics & extra spaces. */
export function normalizeGuess(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

/** Small stable string hash (djb2) → base36. Used to share the word without
 *  revealing it in plaintext to guessers (good enough for casual play). */
export function hashWord(word: string): string {
  const n = normalizeGuess(word);
  let h = 5381;
  for (let i = 0; i < n.length; i += 1) h = (h * 33) ^ n.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Pick `count` distinct random words for the given locale. */
export function pickWords(locale: Locale, count = 3): string[] {
  const pool = [...(WORDS[locale] ?? WORDS.en)];
  const out: string[] = [];
  for (let i = 0; i < count && pool.length; i += 1) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/** Masked word for guessers: letters as •, spaces preserved. */
export function maskWord(len: number, spaces: number[]): string {
  return Array.from({ length: len }, (_, i) => (spaces.includes(i) ? " " : "•")).join("");
}
