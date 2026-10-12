import { useMemo, type CSSProperties, type ReactNode } from "react";
import snapshot from "./__fixtures__/snapshot.json";
import { CompactView, SKIN_NAMES, SkinCtx, StudioView, Widget, get, num, skinContext, textVars, type Data } from "./kit";

/**
 * Dev-only check page for the widget core (`?widget-qa`): the shell with a stub body, plus the
 * studio and compact views, for every skin, fed from the captured sensor snapshot. Real widgets
 * join in 9.3.
 */

const SENSORS = snapshot.sensors as Record<string, { value?: number; text?: string; unit?: string }>;
const DATA: Data = Object.fromEntries(Object.entries(SENSORS).map(([k, v]) => [k, String(v.text ?? v.value ?? "")]));

const CPU = num(get(DATA, "system.cpu.load"));
const RAM = num(get(DATA, "system.ram.load"));
const HIST = [38, 44, 41, 52, 58, 49, 61, 66, 59, CPU];

function Cell({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  return (
    <div className="shrink-0" style={{ width: w, height: h }}>
      {children}
    </div>
  );
}

function SkinRow({ skin }: { skin: string }) {
  const ctx = useMemo(() => skinContext(skin), [skin]);
  const compact = { label: "CPU", value: CPU, unit: "%", pct: CPU, hist: HIST, icon: "memory" };
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-400">{skin}</h2>
      <div className="flex flex-wrap items-start gap-3">
        <Cell w={320} h={220}>
          <Widget skin={skin} surface="auto" title="System" icon="dashboard" compact={compact}>
            {({ w, h, size, shape }) => (
              <div className="font-mono text-xs text-[color:var(--w-muted)]">
                stub body · {Math.round(w)}×{Math.round(h)} · {size} · {shape}
              </div>
            )}
          </Widget>
        </Cell>
        <Cell w={150} h={150}>
          <Widget skin={skin} surface="auto" title="CPU" icon="memory" compact={compact} />
        </Cell>
        <Cell w={220} h={150}>
          <Widget skin={skin} variant="studio" surface="auto" title="RAM" studio={{ label: "RAM", value: RAM, unit: "%", pct: RAM, live: true }} />
        </Cell>
        {/* The views alone, at fixed sizes, on the skin's own surface colours. */}
        <Cell w={260} h={150}>
          <SkinCtx.Provider value={ctx}>
            <div className="h-full rounded-xl bg-zinc-900 p-3" style={{ ...textVars("dark"), "--accent": ctx.accent ?? "#34d399" } as CSSProperties}>
              <StudioView c={{ label: "CPU load", value: CPU, unit: "%", hist: HIST, sub: get(DATA, "system.bridge.time") }} w={260} h={150} icon="memory" />
            </div>
          </SkinCtx.Provider>
        </Cell>
        <Cell w={420} h={120}>
          <SkinCtx.Provider value={ctx}>
            <div className="h-full rounded-xl bg-zinc-900 p-3" style={{ ...textVars("dark"), "--accent": ctx.accent ?? "#34d399" } as CSSProperties}>
              <CompactView c={compact} shape="strip" w={420} h={120} icon="memory" />
            </div>
          </SkinCtx.Provider>
        </Cell>
      </div>
    </section>
  );
}

export default function WidgetQa() {
  return (
    <main className="min-h-screen bg-[#0c0c0e] p-6 text-zinc-100">
      <h1 className="mb-4 text-sm font-semibold">Widget core QA</h1>
      <div className="flex flex-col gap-6">
        {SKIN_NAMES.map((s) => (
          <SkinRow key={s} skin={s} />
        ))}
      </div>
    </main>
  );
}
