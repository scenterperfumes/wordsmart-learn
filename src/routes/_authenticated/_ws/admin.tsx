import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWs } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_ws/admin")({
  head: () => ({
    meta: [
      { title: "Admin · Learn Word Smart" },
      { name: "description", content: "Approve payments, manage users and upload words." },
      { property: "og:title", content: "Admin · Learn Word Smart" },
      { property: "og:description", content: "Learn Word Smart admin control panel." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useWs();
  if (!isAdmin) return <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Admins only.</div>;
  return (
    <Tabs defaultValue="pay">
      <TabsList className="w-full">
        <TabsTrigger value="pay" className="flex-1">Payments</TabsTrigger>
        <TabsTrigger value="users" className="flex-1">Users</TabsTrigger>
        <TabsTrigger value="db" className="flex-1">Words</TabsTrigger>
      </TabsList>
      <TabsContent value="pay"><Payments /></TabsContent>
      <TabsContent value="users"><Users /></TabsContent>
      <TabsContent value="db"><Uploader /></TabsContent>
    </Tabs>
  );
}

function Payments() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_requests").select("*").eq("status", "pending").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const act = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("admin_review_payment", { _id: id, _approve: approve });
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Approved — pass activated" : "Rejected");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };
  if (q.isLoading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (!q.data?.length) return <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">No pending payments.</p>;
  return (
    <div className="flex flex-col gap-2">
      {q.data.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{p.email}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {p.plan_months}M · {p.amount_bdt}৳ · {p.wallet} · {p.sender_phone} · {p.trx_id}
            </div>
            <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
          </div>
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => act(p.id, true)}>Approve</Button>
          <Button size="sm" variant="secondary" onClick={() => act(p.id, false)}>Reject</Button>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<{ id: string; email: string | null; subscription_status: string; subscription_expires_at: string | null; device_1_name: string | null; device_2_name: string | null }[]>([]);
  const search = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,subscription_status,subscription_expires_at,device_1_name,device_2_name")
      .ilike("email", `%${email.trim()}%`)
      .limit(20);
    if (error) { toast.error(error.message); return; }
    setRows(data);
  };
  const extend = async (id: string, months: number) => {
    const { error } = await supabase.rpc("admin_extend", { _user: id, _months: months });
    if (error) { toast.error(error.message); return; }
    toast.success(`Extended by ${months} month(s)`);
    search();
  };
  const clear = async (id: string) => {
    const { error } = await supabase.rpc("admin_clear_devices", { _user: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Devices cleared");
    search();
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input placeholder="Search by email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <Button onClick={search}>Search</Button>
      </div>
      {rows.map((u) => (
        <div key={u.id} className="rounded-xl border bg-card p-3 text-sm">
          <div className="font-semibold">{u.email}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {u.subscription_status.toUpperCase()} {u.subscription_expires_at && `· until ${new Date(u.subscription_expires_at).toLocaleDateString()}`}
          </div>
          <div className="text-xs text-muted-foreground">Devices: {[u.device_1_name, u.device_2_name].filter(Boolean).join(", ") || "none"}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[1, 2, 3].map((m) => (
              <Button key={m} size="sm" variant="secondary" onClick={() => extend(u.id, m)}>+{m}M</Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => clear(u.id)}>Clear devices</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function parseWords(text: string): Record<string, string>[] {
  const t = text.trim();
  if (t.startsWith("[") || /wordsData\s*=/.test(t)) {
    const arr = t.replace(/^[\s\S]*?=\s*/, "").replace(/;\s*$/, "");
    // Admin-pasted JS object literal from words.js
    return new Function(`return (${arr.startsWith("[") ? arr : t})`)();
  }
  const [head, ...lines] = t.split(/\r?\n/).filter(Boolean);
  const cols = head!.split(",").map((c) => c.trim());
  return lines.map((l) => {
    const cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ""]));
  });
}

function Uploader() {
  const [text, setText] = useState("");
  const [markFree, setMarkFree] = useState(true);
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    let words: Record<string, string>[];
    try {
      words = parseWords(text).filter((w) => w["word"]);
    } catch {
      { toast.error("Couldn't read that. Paste a JSON array, the wordsData block, or CSV."); return; }
    }
    if (!words.length) { toast.error("No words found."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_upsert_words", { _words: words, _mark_free: markFree });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${data} words saved`);
  };
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Paste the <code className="font-mono">wordsData</code> array (JSON or words.js), or CSV with headers word,pos,meaningBn,meaningEn,syn,ant,sentence. Words are numbered in paste order.
      </p>
      <Textarea rows={12} className="font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder='[{ "word": "ABASH", ... }]' />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={markFree} onCheckedChange={(v) => setMarkFree(!!v)} /> Mark the first 20 words as free trial
      </label>
      <Button onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Bulk upsert words"}</Button>
    </div>
  );
}
