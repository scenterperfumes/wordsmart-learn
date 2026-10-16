import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWs } from "@/hooks/use-workspace";
import { ADMIN_NUMBER, PLANS, WALLETS } from "@/lib/words";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, Copy } from "lucide-react";

export function PaywallModal() {
  const { paywallOpen, closePaywall, trialHand, history, profile, userId, pendingPayment, refreshPayments, isPaid } = useWs();
  const [plan, setPlan] = useState<1 | 2 | 3>(3);
  const [wallet, setWallet] = useState<(typeof WALLETS)[number]>("bKash");
  const [phone, setPhone] = useState("");
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);

  const known = trialHand.filter((w) => history[w.word]?.status === "learned").length;
  const missed = trialHand.filter((w) => history[w.word]?.status === "weak");
  const sel = PLANS.find((p) => p.months === plan)!;

  const submit = async () => {
    if (!/^01\d{9}$/.test(phone)) return toast.error("Enter an 11-digit phone number starting with 01.");
    if (trx.trim().length < 6) return toast.error("Enter a valid Transaction ID.");
    setBusy(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id: userId,
      email: profile.email,
      plan_months: plan,
      amount_bdt: sel.bdt,
      wallet,
      sender_phone: phone,
      trx_id: trx.trim().toUpperCase(),
    });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "This Transaction ID was already submitted." : "Submission failed. Try again.");
    toast.success("Payment submitted. We'll verify it shortly.");
    setPhone("");
    setTrx("");
    refreshPayments();
  };

  return (
    <Dialog open={paywallOpen} onOpenChange={(o) => !o && closePaywall()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isPaid ? "Extend your pass" : "Assessment report"}</DialogTitle>
          <DialogDescription>
            {isPaid ? "Add more months to your current pass." : "Unlock all words, letters A–Z and the full Quiz Arena."}
          </DialogDescription>
        </DialogHeader>

        {!isPaid && (
          <div className="rounded-xl bg-elevated p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Diagnostic score</span>
              <span className="font-mono text-2xl font-bold">
                {known} <span className="text-muted-foreground">/ {trialHand.length} Known</span>
              </span>
            </div>
            {missed.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {missed.map((w) => (
                  <span key={w.word} className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                    {w.word}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {pendingPayment && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            <Clock className="h-4 w-4" /> Verification Pending — we're checking your payment.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {PLANS.map((p) => (
            <button
              key={p.months}
              onClick={() => setPlan(p.months)}
              className={cn(
                "relative rounded-xl border p-3 text-left transition-colors",
                plan === p.months ? "border-primary bg-primary/10" : "hover:bg-elevated",
              )}
            >
              {"best" in p && p.best && (
                <span className="absolute -top-2 right-2 rounded bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">BEST VALUE</span>
              )}
              <div className="text-xs text-muted-foreground">{p.label}</div>
              <div className="font-mono text-lg font-bold">{p.bdt}৳</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border p-4 text-sm">
          <p>
            Send Money <b className="font-mono">{sel.bdt} BDT</b> via bKash / Nagad / Rocket / Upay to:
          </p>
          <button
            className="mt-2 flex items-center gap-2 font-mono text-lg font-bold text-primary"
            onClick={() => {
              navigator.clipboard?.writeText(ADMIN_NUMBER);
              toast.success("Number copied");
            }}
          >
            {ADMIN_NUMBER} <Copy className="h-4 w-4" />
          </button>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {WALLETS.map((w) => (
              <button
                key={w}
                onClick={() => setWallet(w)}
                className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", wallet === w ? "border-primary bg-primary/10 text-primary" : "")}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2">
            <Input inputMode="numeric" maxLength={11} placeholder="Sender Phone Number (01XXXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
            <Input placeholder="Transaction ID (TrxID)" value={trx} onChange={(e) => setTrx(e.target.value)} />
            <Button onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : `Submit ${sel.label} payment`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
