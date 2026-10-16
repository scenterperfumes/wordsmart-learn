import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDevice } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { FullMessage } from "@/hooks/use-workspace";
import { MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

type Blocked = { ok: false; device_1_name: string | null; device_2_name: string | null; can_reset: boolean; last_reset: string | null };

export function DeviceGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "ok" | Blocked>("checking");

  const check = async () => {
    const d = getDevice();
    const { data, error } = await supabase.rpc("claim_device", { _device_id: d.id, _device_name: d.name });
    if (error) {
      toast.error("Couldn't verify this device.");
      return;
    }
    const r = data as { ok: boolean } & Partial<Blocked>;
    setState(r.ok ? "ok" : (r as Blocked));
  };
  useEffect(() => {
    check();
  }, []);

  if (state === "checking") return <FullMessage text="Checking this device…" />;
  if (state === "ok") return <>{children}</>;

  const reset = async () => {
    const { data } = await supabase.rpc("reset_my_devices");
    if (data) {
      toast.success("Devices reset. This device is now registered.");
      check();
    } else toast.error("Reset is available once every 30 days.");
  };
  const nextReset = state.last_reset ? new Date(new Date(state.last_reset).getTime() + 30 * 86400000) : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6">
        <MonitorSmartphone className="h-8 w-8 text-primary" />
        <h1 className="mt-3 text-xl font-bold">Device limit reached</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account is active on 2 devices. Each pass covers up to 2 devices.</p>
        <ul className="mt-4 space-y-2">
          {[state.device_1_name, state.device_2_name].map((n, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm">
              <span>{n ?? "Unknown device"}</span>
              <span className="font-mono text-xs text-muted-foreground">SLOT {i + 1}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={reset} disabled={!state.can_reset}>
            Reset devices
          </Button>
          {!state.can_reset && nextReset && (
            <p className="text-center text-xs text-muted-foreground">Next self-reset available {nextReset.toLocaleDateString()}</p>
          )}
          <Button variant="ghost" onClick={() => supabase.auth.signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
