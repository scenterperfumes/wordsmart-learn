import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FREE_HAND_SIZE, shuffle, todayKey, type History, type Word, type WordStatus } from "@/lib/words";
import { toast } from "sonner";

type Profile = Tables<"profiles">;

type Ctx = {
  userId: string;
  profile: Profile;
  words: Word[];
  history: History;
  dailyLog: Record<string, number>;
  isPaid: boolean;
  isAdmin: boolean;
  trialHand: Word[];
  pendingPayment: boolean;
  mark: (word: string, status: WordStatus) => void;
  saveLastCard: (masterId: number) => void;
  setExamDate: (d: string) => void;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  refreshPayments: () => void;
};

const WsContext = createContext<Ctx | null>(null);

export function useWs() {
  const c = useContext(WsContext);
  if (!c) throw new Error("useWs outside provider");
  return c;
}

export function WorkspaceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const qc = useQueryClient();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      return data;
    },
  });
  const wordsQ = useQuery({
    queryKey: ["words", userId, profileQ.data?.subscription_status, profileQ.data?.subscription_expires_at],
    enabled: !!profileQ.data,
    queryFn: async () => {
      const { data, error } = await supabase.from("words_vault").select("*").order("master_id").limit(5000);
      if (error) throw error;
      return data as Word[];
    },
  });
  const adminQ = useQuery({
    queryKey: ["isAdmin", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      return !!data;
    },
  });
  const payQ = useQuery({
    queryKey: ["pendingPayment", userId],
    queryFn: async () => {
      const { data } = await supabase.from("payment_requests").select("id").eq("user_id", userId).eq("status", "pending").limit(1);
      return (data?.length ?? 0) > 0;
    },
  });

  const profile = profileQ.data;
  const words = wordsQ.data ?? [];
  const isPaid = !!profile && profile.subscription_status === "active" && !!profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();

  const trialHand = useMemo(() => {
    const free = words.filter((w) => w.is_free_trial);
    const seed = parseInt(userId.replace(/-/g, "").slice(0, 7), 16);
    return shuffle(free, seed).slice(0, FREE_HAND_SIZE);
  }, [words, userId]);

  const patchProfile = useCallback(
    async (patch: Partial<Pick<Profile, "word_history" | "daily_log" | "last_master_id" | "target_exam_date">>) => {
      qc.setQueryData<Profile>(["profile", userId], (old) => (old ? { ...old, ...patch } : old));
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) toast.error("Couldn't sync progress. Check your connection.");
    },
    [qc, userId],
  );

  const mark = useCallback(
    (word: string, status: WordStatus) => {
      const p = qc.getQueryData<Profile>(["profile", userId]);
      if (!p) return;
      const today = todayKey();
      const history = { ...((p.word_history as History) ?? {}), [word]: { status, updatedDate: today } };
      const log = { ...((p.daily_log as Record<string, number>) ?? {}) };
      log[today] = (log[today] ?? 0) + 1;
      patchProfile({ word_history: history, daily_log: log });
    },
    [qc, userId, patchProfile],
  );

  if (profileQ.isError) return <FullMessage text="Couldn't load your profile. Please refresh." />;
  if (!profile || wordsQ.isLoading) return <FullMessage text="Shuffling your deck…" />;

  const value: Ctx = {
    userId,
    profile,
    words,
    history: (profile.word_history as History) ?? {},
    dailyLog: (profile.daily_log as Record<string, number>) ?? {},
    isPaid,
    isAdmin: !!adminQ.data,
    trialHand,
    pendingPayment: !!payQ.data,
    mark,
    saveLastCard: (id) => {
      if (id !== profile.last_master_id) patchProfile({ last_master_id: id });
    },
    setExamDate: (d) => patchProfile({ target_exam_date: d }),
    paywallOpen,
    openPaywall: () => setPaywallOpen(true),
    closePaywall: () => setPaywallOpen(false),
    refreshPayments: () => qc.invalidateQueries({ queryKey: ["pendingPayment", userId] }),
  };
  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function FullMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">{text}</div>
  );
}
