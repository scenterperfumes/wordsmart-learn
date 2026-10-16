export type Word = {
  master_id: number;
  word: string;
  pos: string | null;
  meaning_bn: string | null;
  meaning_en: string | null;
  syn: string | null;
  ant: string | null;
  sentence: string | null;
  is_free_trial: boolean;
};

export type WordStatus = "learned" | "weak";
export type History = Record<string, { status: WordStatus; updatedDate: string }>;

export const PLANS = [
  { months: 1, bdt: 49, label: "1 Month" },
  { months: 2, bdt: 79, label: "2 Months" },
  { months: 3, bdt: 99, label: "3 Months", best: true },
] as const;

export const WALLETS = ["bKash", "Nagad", "Rocket", "Upay"] as const;
export const ADMIN_NUMBER = "01558288319";
export const FREE_HAND_SIZE = 20;
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysUntil(dateStr: string, now = new Date()) {
  const target = new Date(dateStr + "T23:59:59");
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 86400000));
}

/** Cards per day needed to clear all unlearned words before the exam. */
export function dailyTarget(unlearned: number, examDate: string, now = new Date()) {
  if (unlearned <= 0) return 0;
  return Math.ceil(unlearned / daysUntil(examDate, now));
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = arr.slice();
  let s = seed ?? Math.floor(Math.random() * 2 ** 31);
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((seed === undefined ? Math.random() : rand()) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const firstOf = (list: string | null) =>
  (list ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)[0] ?? "";

const listOf = (list: string | null) =>
  (list ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Replace the target word (by stem) inside the sentence with a blank. Returns null if not found. */
export function blankSentence(sentence: string, word: string): string | null {
  const w = word.toLowerCase();
  const stemLen = Math.max(3, Math.min(w.length, w.length > 5 ? w.length - 2 : w.length - 1));
  const stem = w.slice(0, stemLen).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${stem}[a-z]*`, "i");
  if (!re.test(sentence)) return null;
  return sentence.replace(re, "_______");
}

export type QuizFormat = "definition" | "blank" | "synonym" | "antonym" | "bangla";
export const FORMATS: { id: QuizFormat | "mixed"; label: string }[] = [
  { id: "definition", label: "Definition Match" },
  { id: "blank", label: "Fill in the Blank" },
  { id: "synonym", label: "Closest Synonym" },
  { id: "antonym", label: "Opposite / Antonym" },
  { id: "bangla", label: "Bangla to English" },
  { id: "mixed", label: "Mixed Exam Hand" },
];

export type Question = {
  word: Word;
  format: QuizFormat;
  prompt: string;
  sub: string;
  options: string[];
  answer: string;
};

function pick(options: string[], answer: string, n = 3) {
  const uniq = Array.from(new Set(options.filter((o) => o && o.toLowerCase() !== answer.toLowerCase())));
  return shuffle(uniq).slice(0, n);
}

export function buildQuestion(word: Word, format: QuizFormat, pool: Word[]): Question {
  const others = pool.filter((w) => w.master_id !== word.master_id);
  const mk = (prompt: string, sub: string, answer: string, distract: string[]): Question => ({
    word,
    format,
    prompt,
    sub,
    answer,
    options: shuffle([answer, ...pick(distract, answer)]),
  });

  if (format === "blank" && word.sentence) {
    const s = blankSentence(word.sentence, word.word);
    if (s) {
      const samePos = others.filter((o) => o.pos === word.pos);
      const src = samePos.length >= 3 ? samePos : others;
      return mk(s, "Fill in the blank", word.word, src.map((o) => o.word));
    }
  }
  if (format === "synonym" && firstOf(word.syn)) {
    return mk(word.word, "Closest synonym", firstOf(word.syn), others.map((o) => firstOf(o.syn)));
  }
  if (format === "antonym" && firstOf(word.ant)) {
    const trap = firstOf(word.syn);
    const answer = firstOf(word.ant);
    const rest = pick(others.map((o) => firstOf(o.ant)), answer, trap ? 2 : 3);
    return {
      word,
      format,
      prompt: word.word,
      sub: "Opposite / antonym",
      answer,
      options: shuffle([answer, ...(trap ? [trap] : []), ...rest]),
    };
  }
  if (format === "bangla" && word.meaning_bn) {
    return mk(word.meaning_bn, "Pick the English word", word.word, others.map((o) => o.word));
  }
  return {
    ...mk(word.word, "Pick the correct definition", word.meaning_en ?? "", others.map((o) => o.meaning_en ?? "")),
    format: "definition",
  };
}

export const allSyn = listOf;
