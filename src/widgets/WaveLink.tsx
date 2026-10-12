import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, get, fmt, Icon, Dot, Chip, Empty, STATE, type ShellProps, type WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "WaveLink",
  name: "Wave Link",
  category: "Audio",
  icon: "mic",
  prefixes: ["plugins.wavelink-plugin."],
  defaultSize: [2, 2],
  minSize: [1, 1],
  description: "Elgato Wave Link inputs with mute + gain, and live L/R meters per channel.",
};

interface WlInput {
  name: string;
  isMuted?: boolean;
  gain?: { value: number; min?: number; max?: number };
}
interface WlState {
  devices?: { name: string; inputs?: WlInput[] }[];
}
interface WlMeters {
  [id: string]: { left?: number; right?: number };
}

// state is a JSON blob; parse it, or fall back to regex if it arrives truncated
const parseState = (raw: string): WlState => {
  try {
    return JSON.parse(raw) ?? {};
  } catch {
    /* truncated: fall back to the regex below */
  }
  const inputs = [...String(raw).matchAll(/"name":"([^"]+)","isMuted":(true|false),"gain":\{"value":([\d.]+),"min":([\d.]+),"max":([\d.]+)/g)].map((m) => ({ name: m[1], isMuted: m[2] === "true", gain: { value: +m[3], min: +m[4], max: +m[5] } }));
  return { devices: inputs.length ? [{ name: "Inputs", inputs }] : [] };
};

export interface WaveLinkProps extends ShellProps {
  look?: ModuleSettings;
}

export default function WaveLink(p: WaveLinkProps) {
  const d = p.data;
  const k = (s: string) => get(d, `plugins.wavelink-plugin.wavelink.${s}`);
  const up = k("status") === "up";
  const state = parseState(k("state"));
  let meters: WlMeters = {};
  try {
    meters = JSON.parse(k("meters")) || {};
  } catch {
    /* no meters */
  }
  const inputs = (state.devices || []).flatMap((dev) => (dev.inputs || []).map((i) => ({ ...i, dev: dev.name })));
  const ch = Object.entries(meters).map(([id, m]) => ({ id: id.split(":").pop() ?? id, l: (m.left ?? 0) * 100, r: (m.right ?? 0) * 100 }));
  const mic = inputs[0];
  return (
    <Widget
      {...shell(p)}
      title={p.title ?? "Wave Link"}
      icon="mic"
      right={
        <Chip>
          <Dot ok={up} />
          {up ? "Connected" : "Offline"}
        </Chip>
      }
      compact={mic ? { label: mic.name, value: mic.isMuted ? "Muted" : "Live", sub: `Gain ${fmt((mic.gain?.value ?? 0) * 100, 0)}%`, icon: mic.isMuted ? "mic_off" : "mic", kind: "value", t: mic.isMuted ? "crit" : "ok" } : { label: "Wave Link", value: up ? "Up" : "Off", kind: "value" }}
    >
      {({ size }) =>
        !inputs.length && !ch.length ? (
          <Empty icon="mic_off" label={up ? "No devices" : "Wave Link offline"} />
        ) : (
          <div className="flex h-full flex-col gap-3">
            {inputs.map((i, n) => (
              <div key={n} className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${i.isMuted ? "text-[color:var(--w-fg)]" : "bg-[color:var(--w-track)] text-[color:var(--accent)]"}`} style={i.isMuted ? { background: `color-mix(in oklab, ${STATE.crit} 15%, transparent)`, color: STATE.crit } : undefined}>
                  <Icon name={i.isMuted ? "mic_off" : "mic"} className="text-xl" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-[color:var(--w-fg)]">{i.name}</span>
                    <span className="tabular-nums text-[color:var(--w-muted)]">{fmt((i.gain?.value ?? 0) * 100, 0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[color:var(--w-track)]">
                    <div className="h-full rounded-full" style={{ width: `${(i.gain?.value ?? 0) * 100}%`, background: i.isMuted ? "var(--w-faint)" : "var(--accent)" }} />
                  </div>
                </div>
              </div>
            ))}
            {size !== "sm" && ch.length > 0 && (
              <div className="mt-auto flex min-h-[40px] flex-1 items-end gap-2 border-t border-[color:var(--w-track)] pt-3">
                {ch.map((c) => (
                  <div key={c.id} className="flex h-full flex-1 justify-center gap-[3px]" title={c.id}>
                    {[c.l, c.r].map((v, j) => (
                      <div key={j} className="flex w-1.5 flex-col justify-end rounded-full bg-[color:var(--w-track)]">
                        <div className="rounded-full transition-[height] duration-150" style={{ height: `${Math.min(100, v)}%`, background: v > 85 ? STATE.crit : "var(--accent)" }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }
    </Widget>
  );
}
