import { describe, it, expect } from "vitest";
import { PLANS, dailyTarget, blankSentence, buildQuestion, type Word } from "./words";

describe("study rules", () => {
  it("pass prices are 49 / 79 / 99 BDT for 1 / 2 / 3 months", () => {
    expect(PLANS.map((p) => [p.months, p.bdt])).toEqual([
      [1, 49],
      [2, 79],
      [3, 99],
    ]);
  });

  it("daily target divides unlearned words by days left to the exam", () => {
    // noon on 11-20 -> end of 11-30 = 11 days left; 95 words -> 9/day
    expect(dailyTarget(95, "2026-11-30", new Date("2026-11-20T12:00:00"))).toBe(9);
    expect(dailyTarget(0, "2026-11-30", new Date("2026-11-20T12:00:00"))).toBe(0);
  });

  it("fill-in-the-blank hides the word stem in the sentence", () => {
    expect(blankSentence("The storm began to abate after midnight.", "ABATE")).toBe(
      "The storm began to _______ after midnight.",
    );
    expect(blankSentence("He abhorred cruelty.", "ABHOR")).toBe("He _______ cruelty.");
  });

  it("antonym questions include a synonym trap", () => {
    const w = (id: number, word: string, syn: string, ant: string): Word => ({
      master_id: id, word, pos: "verb", meaning_bn: "x", meaning_en: word + " def", syn, ant, sentence: null, is_free_trial: true,
    });
    const target = w(1, "ABATE", "diminish", "intensify");
    const pool = [target, w(2, "B", "b1", "b2"), w(3, "C", "c1", "c2"), w(4, "D", "d1", "d2")];
    const q = buildQuestion(target, "antonym", pool);
    expect(q.answer).toBe("intensify");
    expect(q.options).toContain("diminish");
    expect(q.options).toHaveLength(4);
  });
});
