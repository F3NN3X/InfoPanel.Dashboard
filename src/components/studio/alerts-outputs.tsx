import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import {
  ALERT_BACKDROPS,
  ALERT_SIZES,
  ALERT_STYLES,
  DISPLAY_SECONDS_MAX,
  type AlertDisplayFull,
  type AlertOutputs as Outputs,
  type AlertRule,
} from "@/lib/alerts";
import type { DashboardConfig } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { Field, Group, NumField, PositionGrid, TextField } from "./alerts-fields";
import { SELECT } from "./setting-rows";
import { placementTitle } from "./studio-modules";

interface AlertOutputsProps {
  rule: AlertRule;
  config: DashboardConfig;
  /** The config's display defaults, shown where the rule sets nothing. */
  defaults: AlertDisplayFull;
  /** The profile and page on the canvas. */
  current: { profile: string; page: string };
  /** Edit the rule under a history key (one undo step per field burst). */
  edit: (field: string, fn: (rule: AlertRule) => AlertRule) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const SIZE_LABEL = { s: "S", m: "M", l: "L" } as const;

const TOKENS = "{name} {value} {unit} {app} {title} {body}";

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-[12px] text-ui-2">{label}</span>
      <Toggle checked={checked} label={label} onChange={onChange} />
    </div>
  );
}

/** The rule's outputs: the kiosk display, switching to a page and highlighting widgets. */
export function AlertOutputs({ rule, config, defaults, current, edit }: AlertOutputsProps) {
  const out = rule.outputs;
  const display = out.display ?? {};
  const setOutputs = (field: string, fn: (o: Outputs) => Outputs) => edit(field, (r) => ({ ...r, outputs: fn(r.outputs) }));
  const setDisplay = (field: string, patch: Partial<NonNullable<Outputs["display"]>>) =>
    setOutputs(`display.${field}`, (o) => ({ ...o, display: { ...o.display, ...patch } }));

  const page = out.page;
  const pageProfile = config.profiles.find((p) => p.id === (page?.profile ?? current.profile)) ?? config.profiles[0];
  // The zones offered for highlighting: the page it switches to, else the one on the canvas.
  const zonePage = pageProfile.pages.find((p) => p.id === (page?.page ?? current.page)) ?? pageProfile.pages[0];
  const zones = out.highlight?.zones ?? [];

  return (
    <>
      <Group title="Display">
        <Field label="Style">
          <Segmented
            label="Style"
            value={display.style ?? defaults.style}
            onChange={(style) => setDisplay("style", { style })}
            options={ALERT_STYLES.map((s) => ({ value: s, label: cap(s) }))}
          />
        </Field>
        <div className="flex items-end justify-between gap-3">
          <Field label="Position">
            <PositionGrid value={display.position ?? defaults.position} onChange={(position) => setDisplay("position", { position })} />
          </Field>
          <Field label="Size">
            <Segmented
              label="Size"
              value={display.size ?? defaults.size}
              onChange={(size) => setDisplay("size", { size })}
              options={ALERT_SIZES.map((s) => ({ value: s, label: SIZE_LABEL[s] }))}
            />
          </Field>
        </div>
        <Field label="Backdrop">
          <Segmented
            label="Backdrop"
            value={display.backdrop ?? defaults.backdrop}
            onChange={(backdrop) => setDisplay("backdrop", { backdrop })}
            options={ALERT_BACKDROPS.map((b) => ({ value: b, label: cap(b) }))}
          />
        </Field>
        <Field label="Seconds" hint="0 = stays until acknowledged.">
          <NumField
            label="Display seconds"
            min={0}
            max={DISPLAY_SECONDS_MAX}
            value={display.seconds ?? defaults.seconds}
            onChange={(n) => setDisplay("seconds", { seconds: n ?? 0 })}
          />
        </Field>
        <Field label="Text" hint={`Tokens: ${TOKENS}`}>
          <TextField
            label="Alert text"
            mono
            value={display.text ?? ""}
            placeholder="{value} {unit}"
            onChange={(text) =>
              setOutputs("display.text", (o) => {
                const { text: _was, ...rest } = o.display ?? {};
                return { ...o, display: text === "" ? rest : { ...rest, text } };
              })
            }
          />
        </Field>
      </Group>

      <Group title="Switch to page" defaultOpen={page !== undefined}>
        <Switch
          label="Switch the kiosk to a page"
          checked={page !== undefined}
          onChange={(on) =>
            setOutputs("page", (o) => {
              const { page: _was, ...rest } = o;
              if (!on) return rest;
              const profile = config.profiles.find((p) => p.id === current.profile) ?? config.profiles[0];
              return { ...rest, page: { profile: profile.id, page: current.page, returnAfter: true } };
            })
          }
        />
        {page && (
          <>
            <Field label="Profile">
              <select
                aria-label="Profile"
                value={pageProfile.id}
                onChange={(e) => {
                  const target = config.profiles.find((p) => p.id === e.target.value);
                  if (target) setOutputs("page", (o) => ({ ...o, page: { ...page, profile: target.id, page: target.pages[0].id } }));
                }}
                className={cn(SELECT, "w-full max-w-none")}
              >
                {config.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Page">
              <select
                aria-label="Page"
                value={zonePage.id}
                onChange={(e) => setOutputs("page", (o) => ({ ...o, page: { ...page, page: e.target.value } }))}
                className={cn(SELECT, "w-full max-w-none")}
              >
                {pageProfile.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Switch
              label="Return when it clears"
              checked={page.returnAfter === true}
              onChange={(on) =>
                setOutputs("page.return", (o) => {
                  const { returnAfter: _was, ...rest } = page;
                  return { ...o, page: on ? { ...rest, returnAfter: true } : rest };
                })
              }
            />
          </>
        )}
      </Group>

      <Group title="Highlight widget" defaultOpen={out.highlight !== undefined}>
        <Switch
          label="Ring the zones that show the sensor"
          checked={out.highlight !== undefined}
          onChange={(on) =>
            setOutputs("highlight", (o) => {
              const { highlight: _was, ...rest } = o;
              return on ? { ...rest, highlight: {} } : rest;
            })
          }
        />
        {out.highlight && (
          <Field label="Only these zones" hint={`On “${zonePage.name}”. None ticked = the zones bound to the sensor.`}>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {zonePage.placements.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-[12px] text-ui-2">
                  <input
                    type="checkbox"
                    checked={zones.includes(p.id)}
                    onChange={(e) =>
                      setOutputs("highlight.zones", (o) => {
                        const next = e.target.checked ? [...zones, p.id] : zones.filter((id) => id !== p.id);
                        return { ...o, highlight: next.length > 0 ? { zones: next } : {} };
                      })
                    }
                  />
                  <span className="truncate">
                    {placementTitle(p)} <span className="text-ui-4">({p.colStart},{p.rowStart})</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
        )}
      </Group>
    </>
  );
}
