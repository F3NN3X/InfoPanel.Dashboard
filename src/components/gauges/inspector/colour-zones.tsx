/** The inspector's Colour zones (spec §5): the bands of the previewed sensor's alert rule, read only, with a link to the rule. */
import { ArrowUpRight } from "lucide-react";
import { StatusDot, type StatusTone } from "@/components/ui/status-chip";
import { bandsOf, ZONE_LABEL, type ZoneRead, type ZoneState } from "@/lib/gauge-studio/zones";
import type { GaugeViewPrefs } from "../use-gauge-view";
import { ToggleRow } from "./rows";

const TONE: Record<ZoneState, StatusTone> = { normal: "ok", close: "warn", alert: "danger" };

export interface ColourZonesProps {
  read: ZoneRead;
  view: GaugeViewPrefs;
  onView: (patch: Partial<GaugeViewPrefs>) => void;
  unit: string;
  onOpenRule: (ruleId: string) => void;
}

export function ColourZones({ read, view, onView, unit, onOpenRule }: ColourZonesProps) {
  const { thresholds, from, rule } = read;
  return (
    <section aria-label="Colour zones" className="space-y-1 border-t border-ui-subtle pt-4">
      <h3 className="pb-1 text-body font-medium text-ui-1">Colour zones</h3>
      <ToggleRow label="Follow alert thresholds" value={view.follow} onChange={(follow) => onView({ follow })} />
      {thresholds && (
        <ul className="space-y-0.5 py-1">
          {bandsOf(thresholds, unit).map((b) => (
            <li key={b.state} className="flex min-h-7 items-center gap-2 text-caption text-ui-2">
              <StatusDot tone={TONE[b.state]} />
              <span className="flex-1">{ZONE_LABEL[b.state]}</span>
              <span className="font-ui-mono tabular-nums text-ui-1">{b.text}</span>
            </li>
          ))}
        </ul>
      )}
      {from === "rule" && rule && (
        <button type="button" onClick={() => onOpenRule(rule.id)} className="inline-flex items-center gap-1 rounded-ui-sm text-caption text-ui-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent">
          From “{rule.name}” <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      {from === "gauge" && <p className="text-caption text-ui-3">{view.follow && view.sensor ? "No alert rule watches this sensor. " : ""}From this gauge’s Fill (Warning and Critical)</p>}
      {from === "none" && <p className="text-caption text-ui-3">{view.follow ? "Choose a sensor to preview with, and its alert rule sets the zones." : "No zones: Fill is not set to Thresholds."}</p>}
    </section>
  );
}
