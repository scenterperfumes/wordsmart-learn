import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useWs } from "@/hooks/use-workspace";
import { JijiBar, type JijiState } from "@/components/Jiji";
import { Definition } from "@/components/Definition";
import { Button } from "@/components/ui/button";
import { FORMATS, LETTERS, buildQuestion, shuffle, type Question, type QuizFormat } from "@/lib/words";
import { burstConfetti } from "@/lib/device";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

const search = z.object({ pool: z.enum(["all", "weak", "learned"]).optional() });

export const Route = createFileRoute("/_authenticated/_ws/quiz")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Quiz Arena · Learn Word Smart" },
      { name: "description", content: "Exam-style vocabulary quizzes: definitions, blanks, synonyms, antonyms and Bangla." },
      { property: "og:title", content: "Quiz Arena · Learn Word Smart" },
      { property: "og:description", content: "Five exam-style vocabulary quiz formats." },
    ],
  }),
  component: QuizPage,
});

const LENGTHS = [10, 20, 30, 50];
const BASE_FORMATS: QuizFormat[] = ["definition", "blank", "synonym", "antonym", "bangla"];

function QuizPage() {
  const sp = Route.useSearch();
  const { words, trialHand, isPaid, history, mark, openPaywall } = useWs();
  const [letters, setLetters] = useState<string[]>([]);
  const [pool, setPool] = useState<"all" | "weak" | "learned">(sp.pool ?? "all");
  const [len, setLen] = useState(10);
  const [format, setFormat] = useState<QuizFormat | "mixed">("mixed");
  const [qs, setQs] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [jiji, setJiji] = useState<{ s: JijiState; m: string }>({ s: "IDLE", m: "Pick your hand and let's go." });

  const base = isPaid ? words : trialHand;
  const candidates = base.filter((w) => {
    if (letters.length && !letters.includes(w.word[0]!)) return false;
    const st = history[w.word]?.status;
    if (pool === "weak") return st === "weak";
    if (pool === "learned") return st === "learned";
    return true;
  });

  const start = () => {
    const picks = shuffle(candidates).slice(0, len);
    setQs(picks.map((w) => buildQuestion(w, format === "mixed" ? BASE_FORMATS[Math.floor(Math.random() * 5)]! : format, base)));
    setI(0);
    setPicked(null);
    setScore(0);
    setJiji({ s: "HONESTY CHECK", m: "First question. Take your time." });
  };

  if (!qs) {
    return (
      <div className="flex flex-col gap-4">
        <JijiBar state={jiji.s} message={jiji.m} />
        <div className="-mt-4 flex flex-col gap-5 rounded-b-2xl border bg-card p-5">
          <Section title="Target letters">
            <div className="flex flex-wrap gap-1">
              {LETTERS.map((l) => {
                const locked = !isPaid && l !== "A";
                const on = letters.includes(l);
                return (
                  <button
                    key={l}
                    onClick={() => (locked ? openPaywall() : setLetters(on ? letters.filter((x) => x !== l) : [...letters, l]))}
                    className={cn("flex h-8 w-8 items-center justify-center rounded-md font-mono text-xs font-bold", on ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground", locked && "opacity-50")}
                  >
                    {locked ? <Lock className="h-3 w-3" /> : l}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{letters.length ? letters.join(", ") : "All letters"}</p>
          </Section>
          <Section title="Pool">
            <Chips value={pool} onChange={(v) => setPool(v as typeof pool)} items={[["all", "All"], ["weak", "Practice Pile"], ["learned", "Cleared"]]} />
          </Section>
          <Section title="Length">
            <Chips value={String(len)} onChange={(v) => setLen(Number(v))} items={LENGTHS.map((n) => [String(n), String(n)])} />
          </Section>
          <Section title="Question format">
            <Chips value={format} onChange={(v) => setFormat(v as typeof format)} items={FORMATS.map((f) => [f.id, f.label])} />
          </Section>
          <Button className="h-11" disabled={candidates.length < 1} onClick={start}>
            {candidates.length < 1 ? "No words in this pool yet" : `Deal ${Math.min(len, candidates.length)} questions`}
          </Button>
        </div>
      </div>
    );
  }

  if (i >= qs.length) {
    return (
      <div>
        <JijiBar state={score / qs.length >= 0.7 ? "CORRECT!" : "STUDY MODE"} message={score / qs.length >= 0.7 ? "Great hand! You're exam-ready." : "Missed words went to your Practice Pile."} />
        <div className="rounded-b-2xl border bg-card p-8 text-center">
          <div className="font-mono text-5xl font-bold">
            {score}
            <span className="text-muted-foreground">/{qs.length}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{Math.round((score / qs.length) * 100)}% correct</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={start}>Play again</Button>
            <Button variant="secondary" onClick={() => setQs(null)}>
              New setup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const q = qs[i]!;
  const choose = (o: string, e: React.MouseEvent) => {
    if (picked) return;
    setPicked(o);
    if (o === q.answer) {
      setScore((s) => s + 1);
      burstConfetti(e.clientX, e.clientY);
      setJiji({ s: "CORRECT!", m: `Yes! ${q.word.word} nailed.` });
    } else {
      mark(q.word.word, "weak");
      setJiji({ s: "MISSED!", m: `It was “${q.answer}”. Into the Practice Pile.` });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>
          Q {i + 1} / {qs.length}
        </span>
        <span>Score {score}</span>
      </div>
      <div className="h-1 overflow-hidden rounded bg-elevated">
        <div className="h-full bg-primary transition-all" style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>
      <div>
        <JijiBar state={jiji.s} message={jiji.m} />
        <div className="rounded-b-2xl border bg-card p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{q.sub}</div>
          <h2 className={cn("mt-2 mb-4", q.format === "blank" ? "text-lg" : q.format === "bangla" ? "font-bangla text-2xl font-bold" : "font-display text-3xl font-extrabold")}>{q.prompt}</h2>
          <div className="grid gap-2">
            {q.options.map((o, k) => (
              <button
                key={k}
                onClick={(e) => choose(o, e)}
                className={cn(
                  "rounded-xl border bg-elevated/50 px-4 py-3 text-left text-sm hover:border-primary/50",
                  picked && o === q.answer && "border-success bg-success/15",
                  picked === o && o !== q.answer && "border-destructive bg-destructive/15",
                )}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + k)}</span>
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>
      {picked && (
        <div className="rounded-2xl border bg-card p-5">
          <Definition w={q.word} />
          <Button
            className="mt-4 w-full"
            onClick={() => {
              setI(i + 1);
              setPicked(null);
              setJiji({ s: "HONESTY CHECK", m: "Next one. Focus!" });
            }}
          >
            {i + 1 === qs.length ? "See results" : "Next question"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Chips({ value, onChange, items }: { value: string; onChange: (v: string) => void; items: string[][] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v!)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", value === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
          {l}
        </button>
      ))}
    </div>
  );
}
