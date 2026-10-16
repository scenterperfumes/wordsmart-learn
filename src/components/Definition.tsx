import { Volume2 } from "lucide-react";
import { speak } from "@/lib/device";
import type { Word } from "@/lib/words";

export function Definition({ w }: { w: Word }) {
  return (
    <div className="flex flex-1 flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-extrabold">{w.word}</h3>
        <button aria-label="Pronounce" onClick={() => speak(w.word)} className="rounded-full p-2 hover:bg-elevated">
          <Volume2 className="h-5 w-5" />
        </button>
      </div>
      <p className="font-bangla text-xl font-bold leading-snug text-primary">{w.meaning_bn}</p>
      <p className="text-base">{w.meaning_en}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-success/10 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-success">Synonyms</div>
          <div className="mt-0.5">{w.syn || "—"}</div>
        </div>
        <div className="rounded-lg bg-destructive/10 p-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-destructive">Antonyms</div>
          <div className="mt-0.5">{w.ant || "—"}</div>
        </div>
      </div>
      {w.sentence && <p className="border-l-2 border-primary pl-3 italic text-muted-foreground">“{w.sentence}”</p>}
    </div>
  );
}
