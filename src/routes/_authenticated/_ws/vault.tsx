import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useWs } from "@/hooks/use-workspace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Definition } from "@/components/Definition";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_ws/vault")({
  head: () => ({
    meta: [
      { title: "Word Vault · Learn Word Smart" },
      { name: "description", content: "Search every word and review your Practice and Cleared piles." },
      { property: "og:title", content: "Word Vault · Learn Word Smart" },
      { property: "og:description", content: "Your searchable vocabulary vault and revision piles." },
    ],
  }),
  component: VaultPage,
});

const PER = 25;

function VaultPage() {
  const { words, trialHand, isPaid, history } = useWs();
  const [q, setQ] = useState("");
  const [pile, setPile] = useState<"all" | "weak" | "learned">("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const base = isPaid ? words : trialHand.slice().sort((a, b) => a.master_id - b.master_id);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return base.filter((w) => {
      const st = history[w.word]?.status;
      if (pile !== "all" && st !== pile) return false;
      if (!s) return true;
      return w.word.toLowerCase().includes(s) || (w.meaning_en ?? "").toLowerCase().includes(s) || (w.meaning_bn ?? "").includes(s);
    });
  }, [base, q, pile, history]);
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const rows = list.slice(page * PER, page * PER + PER);
  const count = (p: string) => base.filter((w) => history[w.word]?.status === p).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Search word or meaning…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {([["all", `All Words · ${base.length}`], ["weak", `Practice Pile (Weak) · ${count("weak")}`], ["learned", `Cleared Pile (Learned) · ${count("learned")}`]] as const).map(([v, l]) => (
          <button key={v} onClick={() => { setPile(v); setPage(0); }} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", pile === v ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}>
            {l}
          </button>
        ))}
        <Button asChild size="sm" className="ml-auto h-7 text-xs">
          <Link to="/quiz" search={{ pool: pile }}>
            Quiz This Pile
          </Link>
        </Button>
      </div>

      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nothing here yet.</div>}
        {rows.map((w) => {
          const st = history[w.word]?.status;
          return (
            <div key={w.master_id}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-elevated/50" onClick={() => setOpen(open === w.master_id ? null : w.master_id)}>
                <span className="w-10 font-mono text-xs text-muted-foreground">#{w.master_id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{w.word}</span>
                  <span className="block truncate font-bangla text-sm text-muted-foreground">{w.meaning_bn}</span>
                </span>
                <span className={cn("h-2 w-2 rounded-full", st === "learned" ? "bg-success" : st === "weak" ? "bg-warning" : "bg-elevated")} />
              </button>
              {open === w.master_id && (
                <div className="bg-elevated/30 px-4 py-4">
                  <Definition w={w} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {page + 1} / {pages}
        </span>
        <Button variant="ghost" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
