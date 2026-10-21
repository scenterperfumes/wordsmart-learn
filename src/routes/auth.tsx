import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/PasswordField";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: pageMeta('Sign in', 'Email and password access to Learn Word Smart.'),
  }),
  component: AuthPage,
});

export const QUESTIONS = [
  "What is your favourite food?",
  "What was the name of your first school?",
  "What is your favourite teacher's name?",
] as const;

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [question, setQuestion] = useState<string>(QUESTIONS[0]);
  const [answer, setAnswer] = useState("");
  const [found, setFound] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (m: "in" | "up" | "forgot") => {
    setMode(m); setStep(1); setPw(""); setConfirm(""); setAnswer(""); setFound(""); setBusy(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      nav({ to: "/study" });
      return;
    }
    if (mode === "up") {
      if (pw !== confirm) { setBusy(false); toast.error("Passwords do not match. Retype them exactly."); return; }
      if (answer.trim().length < 2) { setBusy(false); toast.error("Answer your security question — you will need it to reset your password."); return; }
      const { data, error } = await supabase.auth.signUp({ email, password: pw });
      if (error) { setBusy(false); toast.error(error.message); return; }
      if (data.session) {
        const { error: qErr } = await supabase.rpc("set_security_answer", { _question: question, _answer: answer.trim() });
        setBusy(false);
        if (qErr) toast.error("Account created, but the security question failed to save. You can add it later from support.");
        else toast.success("Account created.");
        nav({ to: "/study" });
        return;
      }
      setBusy(false);
      toast.success("Check your email to confirm your account.");
      return;
    }
    if (step === 1) {
      const { data, error } = await supabase.rpc("get_security_question", { _email: email.trim() });
      setBusy(false);
      if (error) { toast.error("Could not look up your question. Please try again."); return; }
      if (!data) { toast.error("No security question is set for this email."); return; }
      setFound(data);
      setStep(2);
      return;
    }
    if (pw !== confirm) { setBusy(false); toast.error("New passwords do not match."); return; }
    const { data, error } = await supabase.rpc("reset_password_with_answer", { _email: email.trim(), _answer: answer.trim(), _new_password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!data) { toast.error("The answer didn't match. Try again."); return; }
    toast.success("Password updated. Sign in with your new password.");
    setEmail(email); switchMode("in");
  };

  const title = mode === "in" ? "Welcome back" : mode === "up" ? "Create account" : "Reset password";

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border bg-card p-6">
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Learn Word Smart</p>
        <div className="mt-5 grid gap-2">
          <Input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {mode === "in" && (
            <>
              <PasswordField ariaLabel="Password" placeholder="Password" value={pw} onChange={setPw} />
              <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
            </>
          )}
          {mode === "up" && (
            <>
              <PasswordField ariaLabel="Password" autoComplete="new-password" placeholder="Password (min 6 characters)" value={pw} onChange={setPw} />
              <PasswordField ariaLabel="Retype password" autoComplete="new-password" placeholder="Retype password" value={confirm} onChange={setConfirm} />
              <select
                aria-label="Security question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
              <Input
                required
                aria-label="Security answer"
                placeholder="Answer to your security question"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <Button disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
            </>
          )}
          {mode === "forgot" && step === 1 && (
            <>
              <Button disabled={busy}>{busy ? "Looking…" : "Find my security question"}</Button>
            </>
          )}
          {mode === "forgot" && step === 2 && (
            <>
              <div className="rounded-md border bg-muted/40 p-3 text-sm font-medium">{found}</div>
              <Input
                required
                aria-label="Security answer"
                placeholder="Your answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <PasswordField ariaLabel="New password" autoComplete="new-password" placeholder="New password (min 6 characters)" value={pw} onChange={setPw} />
              <PasswordField ariaLabel="Retype new password" autoComplete="new-password" placeholder="Retype new password" value={confirm} onChange={setConfirm} />
              <Button disabled={busy}>{busy ? "Resetting…" : "Reset password"}</Button>
            </>
          )}
        </div>
        {mode === "in" && (
          <div className="mt-4 flex flex-col gap-1">
            <Button type="button" variant="ghost" className="self-start px-2 text-sm text-primary" onClick={() => switchMode("forgot")}>
              Forgot password?
            </Button>
            <Button type="button" variant="ghost" className="self-start px-2 text-sm text-primary" onClick={() => switchMode("up")}>
              New here? Create an account
            </Button>
          </div>
        )}
        {mode === "up" && (
          <Button type="button" variant="ghost" className="mt-4 text-sm text-primary" onClick={() => switchMode("in")}>
            Have an account? Sign in
          </Button>
        )}
        {mode === "forgot" && (
          <Button type="button" variant="ghost" className="mt-4 text-sm text-primary" onClick={() => switchMode("in")}>
            Back to sign in
          </Button>
        )}
      </form>
    </div>
  );
}
