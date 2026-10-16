import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Volume2, Zap } from "lucide-react";
import { useWs } from "@/hooks/use-workspace";
import { JijiBar, type JijiState } from "@/components/Jiji";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LETTERS, FREE_HAND_SIZE, dailyTarget, shuffle, todayKey, type Word } from "@/lib/words";
import { burstConfetti, speak } from "@/lib/device";
import { cn } from "@/lib/utils";
import { Definition } from "@/components/Definition";

export const Route = createFileRoute("/_authenticated/_ws/study")({
  head: () => ({
    meta: [
      { title: "Study Deck · Learn Word Smart" },
      { name: "description", content: "Flip through vocabulary flashcards with Bangla meanings and honesty checks." },
      { property: "og:title", content: "Study Deck · Learn Word Smart" },
      { property: "og:description", content: "Flashcards with Bangla meanings, synonyms and example sentences." },
    ],
  }),
  component: StudyPage,
});

type StatusFilter = "all" | "unlearned" | "weak" | "learned";
type Face = "front" | "mcq" | "def";

function StudyPage() {
  const { words, history, isPaid, trialHand, mark, openPaywall, profile, dailyLog, saveLastCard } = useWs();
  const [letter, setLetter] = useState("ALL");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [jump, setJump] = useState("");
  const [idx, setIdx] = useState(0);
  const [face, setFace] = useState<Face>("front");
  const [picked, setPicked] = useState<string | null>(null);
  const [jiji, setJiji] = useState<{ s: JijiState; m: string }>({ s: "IDLE", m: "Ready when you are. Be honest with me!" });
  const initialized = useRef(false);

  const base = isPaid ? words : trialHand;
  const deck = useMemo(
    () =>
      base.filter((w) => {
        if (letter !== "ALL" && !w.word.startsWith(letter)) return false;
        const st = history[w.word]?.status;
        if (status === "unlearned") return !st;
        if (status === "weak") return st === "weak";
        if (status === "learned") return st === "learned";
        return true;
      }),
    [base, letter, status, history],
  );

  // Resume from last card once
  useEffect(() => {
    if (initialized.current || !deck.length) return;
    initialized.current = true;
    if (isPaid) {
      const i = deck.findIndex((w) => w.master_id === profile.last_master_id);
      if (i > 0) setIdx(i);
    }
  }, [deck, isPaid, profile.last_master_id]);

  const safeIdx = Math.min(idx, Math.max(0, deck.length - 1));
  const card: Word | undefined = deck[safeIdx];

  const options = useMemo(() => {
    if (!card) return [];
    const others = shuffle(words.filter((w) => w.master_id !== card.master_id && w.meaning_en)).slice(0, 3);
    return shuffle([card.meaning_en ?? "", ...others.map((o) => o.meaning_en ?? "")]);
  }, [card, words]);

  const go = (d: number) => {
    if (!deck.length) return;
    const n = (safeIdx + d + deck.length) % deck.length;
    setIdx(n);
    setFace("front");
    setPicked(null);
    setJiji({ s: "IDLE", m: "Next card! What do you think it means?" });
    if (isPaid) saveLastCard(deck[n].master_id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const touchX = useRef<number | null>(null);

  const trialPos = !isPaid && card ? trialHand.findIndex((w) => w.master_id === card.master_id) + 1 : 0;
  const maybeEndTrial = () => {
    if (!isPaid && trialPos === FREE_HAND_SIZE) setTimeout(openPaywall, 1400);
  };

  const onKnown = () => {
    setFace("mcq");
    setJiji({ s: "HONESTY CHECK", m: `Prove it — what does ${card!.word} mean?` });
  };
  const onUnknown = () => {
    mark(card!.word, "weak");
    setFace("def");
    setJiji({ s: "STUDY MODE", m: "No worries. Read it slowly, it goes to your Practice Pile." });
    maybeEndTrial();
  };
  const onPick = (opt: string, e: React.MouseEvent) => {
    if (picked) return;
    setPicked(opt);
    const right = opt === card!.meaning_en;
    mark(card!.word, right ? "learned" : "weak");
    if (right) {
      burstConfetti(e.clientX, e.clientY);
      setJiji({ s: "CORRECT!", m: "Purr-fect! That one is cleared." });
    } else setJiji({ s: "MISSED!", m: "Close, but not quite. Added to your Practice Pile." });
    setTimeout(() => setFace("def"), 900);
    maybeEndTrial();
  };

  // metrics
  const pool = isPaid ? words : trialHand;
  const learned = pool.filter((w) => history[w.word]?.status === "learned").length;
  const weak = pool.filter((w) => history[w.word]?.status === "weak").length;
  const target = dailyTarget(pool.length - learned, profile.target_exam_date);
  const today = dailyLog[todayKey()] ?? 0;

  const doJump = () => {
    const n = parseInt(jump, 10);
    if (!n) return;
    const i = deck.findIndex((w) => w.master_id === n);
    if (i >= 0) {
      setIdx(i);
      setFace("front");
      setPicked(null);
    } else if (!isPaid) openPaywall();
    setJump("");
  };
  const firstUnlearned = () => {
    setStatus("all");
    setLetter("ALL");
    const i = base.findIndex((w) => !history[w.word]);
    if (i >= 0) {
      setIdx(i);
      setFace("front");
      setPicked(null);
    }
  };

  const st = card ? history[card.word]?.status : undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2 font-mono text-[11px] sm:text-xs">
        <Pill label="Daily Target" value={`${today} / ${target}`} />
        <Pill label="Cleared" value={`${learned} (${pool.length ? Math.round((learned / pool.length) * 100) : 0}%)`} tone="success" />
        <Pill label="Practice Pile" value={String(weak)} tone="warning" />
      </div>

      <div className="no-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3">
        {["ALL", ...LETTERS].map((l) => {
          const locked = !isPaid && l !== "ALL" && l !== "A";
          return (
            <button
              key={l}
              onClick={() => {
                if (locked) return openPaywall();
                setLetter(l);
                setIdx(0);
                setFace("front");
                setPicked(null);
              }}
              className={cn(
                "flex h-8 min-w-8 shrink-0 items-center justify-center gap-0.5 rounded-md px-2 font-mono text-xs font-bold",
                letter === l ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                locked && "opacity-50",
              )}
            >
              {l}
              {locked && <Lock className="h-2.5 w-2.5" />}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v as StatusFilter); setIdx(0); setFace("front"); setPicked(null); }}>
          <SelectTrigger className="h-9 w-[130px] bg-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unlearned">Unlearned</SelectItem>
            <SelectItem value="weak">Practice Pile</SelectItem>
            <SelectItem value="learned">Cleared</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-9 w-20 bg-card font-mono text-xs"
          placeholder="# Jump"
          inputMode="numeric"
          value={jump}
          onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && doJump()}
          onBlur={doJump}
        />
        <Button variant="secondary" size="sm" className="h-9 flex-1 text-xs" onClick={firstUnlearned}>
          <Zap className="h-3.5 w-3.5 text-warning" /> First Unlearned
        </Button>
      </div>

      {!isPaid && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs">
          <span>
            Free Assessment Hand: Card <b className="font-mono">{trialPos || "–"}</b> of {FREE_HAND_SIZE}
          </span>
          <button className="font-semibold text-primary" onClick={openPaywall}>
            Unlock all
          </button>
        </div>
      )}

      {!card ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">No cards match these filters.</div>
      ) : (
        <div
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <JijiBar state={jiji.s} message={jiji.m} />
          <div className="flip-scene h-[max(340px,calc(100dvh-330px))] lg:h-[460px]">
            <div className={cn("flip-inner", face !== "front" && "is-flipped")}>
              {/* FRONT */}
              <div className="flip-face flex flex-col rounded-b-2xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">#{card.master_id}</span>
                  <div className="flex gap-1.5">
                    {card.pos && <span className="rounded bg-elevated px-2 py-0.5 text-[11px] font-semibold italic">{card.pos}</span>}
                    <StatusTag st={st} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <h2 className="break-all text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{card.word}</h2>
                  <button aria-label="Pronounce" onClick={() => speak(card.word)} className="rounded-full p-2 text-muted-foreground hover:bg-elevated hover:text-foreground">
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="h-12 bg-success text-success-foreground hover:bg-success/90" onClick={onKnown}>
                    Known (Test Me)
                  </Button>
                  <Button variant="secondary" className="h-12" onClick={onUnknown}>
                    Unknown (Show Meaning)
                  </Button>
                </div>
              </div>
              {/* BACK */}
              <div className="flip-face flip-back flex flex-col overflow-y-auto rounded-b-2xl border bg-card p-5">
                {face === "mcq" ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">HONESTY CHECK</span>
                      <span className="font-display text-xl font-extrabold">{card.word}</span>
                    </div>
                    <div className="flex flex-1 flex-col justify-center gap-2">
                      {options.map((o, i) => {
                        const right = o === card.meaning_en;
                        return (
                          <button
                            key={i}
                            onClick={(e) => onPick(o, e)}
                            className={cn(
                              "rounded-xl border bg-elevated/50 px-4 py-3 text-left text-sm transition-colors hover:border-primary/50",
                              picked && right && "border-success bg-success/15",
                              picked === o && !right && "border-destructive bg-destructive/15",
                            )}
                          >
                            <span className="mr-2 font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <Definition w={card} />
                )}
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setFace("front"); setPicked(null); }}>
                    Flip back
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => go(1)}>
                    Next card
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => go(-1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              {safeIdx + 1} / {deck.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => go(1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return (
    <div className="rounded-lg border bg-card px-2.5 py-1.5">
      <div className="truncate font-sans text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("truncate font-bold", tone === "success" && "text-success", tone === "warning" && "text-warning")}>{value}</div>
    </div>
  );
}

function StatusTag({ st }: { st?: string }) {
  if (st === "learned") return <span className="rounded bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">Cleared</span>;
  if (st === "weak") return <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">Practice</span>;
  return <span className="rounded bg-elevated px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">New</span>;
}

