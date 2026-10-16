import { cn } from "@/lib/utils";

export type JijiState = "IDLE" | "HONESTY CHECK" | "STUDY MODE" | "CORRECT!" | "MISSED!";

const badge: Record<JijiState, string> = {
  IDLE: "bg-elevated text-muted-foreground",
  "HONESTY CHECK": "bg-warning/15 text-warning",
  "STUDY MODE": "bg-primary/15 text-primary",
  "CORRECT!": "bg-success/15 text-success",
  "MISSED!": "bg-destructive/15 text-destructive",
};

function Cat({ state }: { state: JijiState }) {
  const happy = state === "CORRECT!";
  const sad = state === "MISSED!";
  return (
    <svg
      key={state}
      viewBox="0 0 100 100"
      className={cn("h-[42px] w-[42px] shrink-0", happy ? "jiji-hop" : sad ? "jiji-shake" : "jiji-bob")}
      aria-hidden
    >
      <polygon points="22,48 16,12 44,32" fill="var(--cat-coat)" stroke="currentColor" strokeOpacity=".25" />
      <polygon points="78,48 84,12 56,32" fill="var(--cat-coat)" stroke="currentColor" strokeOpacity=".25" />
      <polygon points="25,42 21,22 37,33" fill="var(--primary)" opacity=".55" />
      <polygon points="75,42 79,22 63,33" fill="var(--primary)" opacity=".55" />
      <ellipse cx="50" cy="56" rx="30" ry="26" fill="var(--cat-coat)" stroke="currentColor" strokeOpacity=".25" />
      <g className="jiji-eyes">
        {happy ? (
          <>
            <path d="M32 55 Q38 48 44 55" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M56 55 Q62 48 68 55" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="38" cy="54" rx="6.5" ry={sad ? 3.5 : 5} fill="#fbbf24" />
            <ellipse cx="62" cy="54" rx="6.5" ry={sad ? 3.5 : 5} fill="#fbbf24" />
            <ellipse cx="38" cy="54" rx="1.8" ry={sad ? 3 : 4.5} fill="#09090b" />
            <ellipse cx="62" cy="54" rx="1.8" ry={sad ? 3 : 4.5} fill="#09090b" />
          </>
        )}
      </g>
      <polygon points="47,63 53,63 50,67" fill="#fb7185" />
      {sad ? (
        <path d="M44 72 Q50 68 56 72" stroke="#cbd5e1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M44 69 Q50 74 56 69" stroke="#cbd5e1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      <path d="M12 60 L28 62 M10 66 L28 65 M88 60 L72 62 M90 66 L72 65" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function JijiBar({ state, message }: { state: JijiState; message: string }) {
  return (
    <div className="flex h-[52px] items-center gap-3 rounded-t-2xl border border-b-0 bg-elevated/60 px-3 text-foreground">
      <Cat state={state} />
      <span className={cn("shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider", badge[state])}>
        {state}
      </span>
      <p className="truncate text-sm text-muted-foreground" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
