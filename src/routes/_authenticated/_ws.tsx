import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Swords, Library, Shield, LogOut, Moon, Sun, X } from "lucide-react";
import { WorkspaceProvider, useWs } from "@/hooks/use-workspace";
import { DeviceGate } from "@/components/DeviceGate";
import { PaywallModal } from "@/components/PaywallModal";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_ws")({
  component: WsLayout,
});

function WsLayout() {
  const { user } = Route.useRouteContext();
  return (
    <DeviceGate>
      <WorkspaceProvider userId={user.id}>
        <Shell />
      </WorkspaceProvider>
    </DeviceGate>
  );
}

const tabs = [
  { to: "/study", label: "Study Deck", icon: BookOpen },
  { to: "/quiz", label: "Quiz Arena", icon: Swords },
  { to: "/vault", label: "Word Vault", icon: Library },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      aria-label="Toggle theme"
      className="rounded-md p-2 text-muted-foreground hover:bg-elevated hover:text-foreground"
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("lws_theme", next ? "dark" : "light");
        setDark(next);
      }}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function ExpiryBar() {
  const { profile, isPaid, openPaywall } = useWs();
  const [hidden, setHidden] = useState(false);
  if (!isPaid || hidden || !profile.subscription_expires_at) return null;
  const days = Math.ceil((new Date(profile.subscription_expires_at).getTime() - Date.now()) / 86400000);
  if (days > 7) return null;
  return (
    <div className="flex items-center gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
      <span className="flex-1">Your pass expires in {days} day{days === 1 ? "" : "s"}.</span>
      <Button size="sm" variant="outline" className="h-7 border-warning/40" onClick={openPaywall}>
        Extend Pass
      </Button>
      <button aria-label="Dismiss" onClick={() => setHidden(true)}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Shell() {
  const { isAdmin, isPaid, profile } = useWs();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const all = isAdmin ? [...tabs, { to: "/admin", label: "Admin", icon: Shield } as const] : tabs;

  return (
    <div className="min-h-dvh bg-background lg:pl-[240px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col border-r bg-sidebar p-4 lg:flex">
        <Link to="/study" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-lg font-extrabold text-primary-foreground">W</span>
          <span className="font-bold tracking-tight">Learn Word Smart</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {all.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                path === t.to && "bg-sidebar-accent text-foreground",
              )}
            >
              <t.icon className={cn("h-4 w-4", path === t.to && "text-primary")} />
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-lg bg-elevated p-3 text-xs">
          <div className="truncate text-muted-foreground">{profile.email}</div>
          <div className={cn("mt-1 font-mono font-bold", isPaid ? "text-success" : "text-warning")}>
            {isPaid ? `PASS · until ${new Date(profile.subscription_expires_at!).toLocaleDateString()}` : "FREE TRIAL"}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background/85 px-4 backdrop-blur">
        <span className="font-bold tracking-tight lg:hidden">Learn Word Smart</span>
        <span className="hidden text-sm text-muted-foreground lg:block">{all.find((t) => t.to === path)?.label}</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button aria-label="Sign out" className="rounded-md p-2 text-muted-foreground hover:bg-elevated hover:text-foreground" onClick={() => supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <ExpiryBar />

      <main className="mx-auto max-w-3xl px-3 pb-[76px] pt-3 lg:px-6 lg:pb-8 lg:pt-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {all.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground", path === t.to && "text-primary")}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        ))}
      </nav>
      <PaywallModal />
    </div>
  );
}
