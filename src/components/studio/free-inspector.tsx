import { useMemo, useState } from "react";
import type { SensorMap } from "@/modules";
import {
  type IPSensorBinding,
  type IPSensorImageItem,
  type IPBarItem,
  type IPClockItem,
  type IPDonutItem,
  type IPGraphItem,
  type IPGaugeItem,
  type IPGroupItem,
  type IPHttpImageItem,
  type IPImageItem,
  type IPItem,
  type IPProfile,
  type IPSensorItem,
  type IPShapeItem,
  type IPShapeType,
  type IPTableItem,
  type IPTextBlock,
  type IPTextItem,
} from "@/lib/ip/types";

export interface FreeStudioOps {
  sensors: SensorMap;
  patchItem: (id: string, patch: Record<string, unknown>) => void;
  patchProfile: (patch: Partial<IPProfile>) => void;
  selected: IPItem | null;
  profile: IPProfile;
}

/* ---------------- small field controls ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 py-0.5 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded-md border bg-popover px-1.5 py-0.5 text-right tabular-nums"
      />
    </Field>
  );
}

function Txt({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-36 rounded-md border bg-popover px-1.5 py-0.5 ${mono ? "font-mono text-[11px]" : ""}`}
      />
    </Field>
  );
}

function Chk({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** .NET #AARRGGBB <-> <input type=color> (#RRGGBB, alpha forced FF). */
function Col({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const h = (value || "#000000").replace("#", "");
  const css6 = h.length === 8 ? "#" + h.slice(2) : value;
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(css6) ? css6 : "#000000"}
          onChange={(e) => onChange("#FF" + e.target.value.slice(1).toUpperCase())}
          className="h-5 w-7 cursor-pointer rounded border bg-transparent"
        />
        <span className="font-mono text-[10px] text-muted-foreground">{value}</span>
      </div>
    </Field>
  );
}

function Sel<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-32 rounded-md border bg-popover px-1 py-0.5"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b py-2">
      <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

/* ---------------- sensor picker ---------------- */

function SensorPicker({
  sensors,
  binding,
  onPick,
}: {
  sensors: SensorMap;
  binding: IPSensorBinding;
  onPick: (key: string, name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const needle = q.toLowerCase();
    return Object.entries(sensors)
      .filter(
        ([k, s]) =>
          !needle ||
          k.toLowerCase().includes(needle) ||
          (s.name ?? "").toLowerCase().includes(needle)
      )
      .slice(0, 120);
  }, [sensors, q]);

  return (
    <div className="py-1">
      <div className="relative">
        <input
          value={open ? q : (binding.sensorName ?? binding.bridgeKey ?? "—")}
          placeholder="Pick a live sensor…"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full rounded-md border bg-popover px-2 py-1 font-mono text-[11px]"
        />
        {open && list.length > 0 && (
          <div className="absolute z-50 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
            {list.map(([k, s]) => (
              <button
                key={k}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(k, s.name ?? k);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-[11px] hover:bg-accent"
              >
                <span className="truncate font-mono">{k}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {typeof s.value === "number" ? s.value : s.text ?? ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {binding.bridgeKey
          ? `bound: ${binding.bridgeKey}`
          : binding.libreId
            ? `libre: ${binding.libreId}`
            : binding.pluginId
              ? `plugin: ${binding.pluginId}`
              : "not bound"}
      </p>
    </div>
  );
}

function bindingFields(
  ops: FreeStudioOps,
  b: IPSensorBinding,
  set: (patch: Record<string, unknown>) => void
) {
  return (
    <>
      <SensorPicker
        sensors={ops.sensors}
        binding={b}
        onPick={(key, name) =>
          set({
            sensor: {
              ...b,
              bridgeKey: key,
              sensorName: name,
              sensorType: key.startsWith("plugins.") ? "plugin" : "libre",
            },
          })
        }
      />
      <Chk
        label="Show name"
        value={!!b.showName}
        onChange={(v) => set({ sensor: { ...b, showName: v } })}
      />
      <Sel
        label="Value"
        value={(b.valueType ?? "NOW") as "NOW" | "MIN" | "MAX" | "AVERAGE"}
        options={["NOW", "MIN", "MAX", "AVERAGE"] as const}
        onChange={(v) => set({ sensor: { ...b, valueType: v } })}
      />
      <Num
        label="Precision"
        value={b.precision ?? 0}
        onChange={(v) => set({ sensor: { ...b, precision: v } })}
      />
      <Num
        label="× Modifier"
        value={b.multiplicationModifier ?? 1}
        step={0.1}
        onChange={(v) => set({ sensor: { ...b, multiplicationModifier: v } })}
      />
      <Num
        label="+ Modifier"
        value={b.additionModifier ?? 0}
        step={0.1}
        onChange={(v) => set({ sensor: { ...b, additionModifier: v } })}
      />
      <Chk
        label="÷10 toggle"
        value={!!b.divisionToggle}
        onChange={(v) => set({ sensor: { ...b, divisionToggle: v } })}
      />
      <Num
        label="Threshold 1"
        value={b.threshold1 ?? 0}
        onChange={(v) => set({ sensor: { ...b, threshold1: v } })}
      />
      <Col
        label="T1 color"
        value={b.threshold1Color ?? "#000000"}
        onChange={(v) => set({ sensor: { ...b, threshold1Color: v } })}
      />
      <Num
        label="Threshold 2"
        value={b.threshold2 ?? 100}
        onChange={(v) => set({ sensor: { ...b, threshold2: v } })}
      />
      <Col
        label="T2 color"
        value={b.threshold2Color ?? "#000000"}
        onChange={(v) => set({ sensor: { ...b, threshold2Color: v } })}
      />
    </>
  );
}

/* ---------------- text block fields ---------------- */

function textFields(
  t: IPTextBlock,
  set: (patch: Record<string, unknown>) => void
) {
  return (
    <Section title="Text">
      <Num label="Font size" value={t.fontSize} onChange={(v) => set({ fontSize: v })} />
      <div className="flex gap-1 py-0.5">
        {(
          [
            ["Bold", "bold"],
            ["Italic", "italic"],
            ["Underline", "underline"],
            ["Strikeout", "strikeout"],
            ["UPPERCASE", "uppercase"],
          ] as const
        ).map(([label, key]) => (
          <button
            key={key}
            onClick={() => set({ [key]: !t[key] })}
            className={`rounded-md border px-1.5 py-0.5 text-[10px] ${t[key] ? "bg-accent" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Col label="Color" value={t.color ?? "#000000"} onChange={(v) => set({ color: v })} />
      <div className="flex gap-3 py-0.5">
        <Chk label="Right" value={!!t.rightAlign} onChange={(v) => set({ rightAlign: v, centerAlign: false })} />
        <Chk label="Center" value={!!t.centerAlign} onChange={(v) => set({ centerAlign: v, rightAlign: false })} />
      </div>
      <div className="flex gap-3 py-0.5">
        <Chk label="Wrap" value={t.wrap !== false} onChange={(v) => set({ wrap: v })} />
        <Chk label="Ellipsis" value={!!t.ellipsis} onChange={(v) => set({ ellipsis: v })} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Num label="Width (0=auto)" value={t.width} onChange={(v) => set({ width: v })} />
        </div>
        <div className="flex-1">
          <Num label="Height" value={t.height} onChange={(v) => set({ height: v })} />
        </div>
      </div>
      <Chk label="Glow" value={!!t.glowEnabled} onChange={(v) => set({ glowEnabled: v })} />
      {t.glowEnabled && (
        <>
          <Num label="Glow radius" value={t.glowRadius ?? 8} onChange={(v) => set({ glowRadius: v })} />
          <Col label="Glow color" value={t.glowColor ?? "#000000"} onChange={(v) => set({ glowColor: v })} />
        </>
      )}
    </Section>
  );
}

/* ---------------- main inspector ---------------- */

export function FreeInspector({
  mode,
  ops,
  onProfile,
}: {
  mode: "item" | "profile";
  ops: FreeStudioOps;
  onProfile?: (patch: Partial<IPProfile>) => void;
}) {
  if (mode === "profile") return <ProfileFields ops={ops} onProfile={onProfile} />;
  const it = ops.selected;
  if (!it)
    return (
      <p className="text-xs text-muted-foreground">
        Select an item on the canvas to edit its properties. Shift+click
        multi-selects for group / Z-order / duplicate / delete.
      </p>
    );
  const id = it.id;
  const set = (patch: Record<string, unknown>) => ops.patchItem(id, patch);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{it.kind}</h2>
        <span className="font-mono text-[10px] text-muted-foreground">{id}</span>
      </div>
      <Section title="Placement">
        <Txt label="Name" value={it.name} onChange={(v) => set({ name: v })} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Num label="X" value={it.x} onChange={(v) => set({ x: v })} />
          </div>
          <div className="flex-1">
            <Num label="Y" value={it.y} onChange={(v) => set({ y: v })} />
          </div>
        </div>
        <Sel
          label="Rotation"
          value={String(it.rotation) as "0" | "90" | "180" | "270"}
          options={["0", "90", "180", "270"] as const}
          onChange={(v) => set({ rotation: Number(v) })}
        />
        <Chk label="Hidden" value={it.hidden} onChange={(v) => set({ hidden: v })} />
        <Chk label="Locked" value={it.locked} onChange={(v) => set({ locked: v })} />
      </Section>

      {("text" in it) && textFields(it as IPTextItem, set)}

      {it.kind === "text" && (
        <Section title="Content">
          <Txt label="Text" value={(it as IPTextItem).text} onChange={(v) => set({ text: v })} />
        </Section>
      )}
      {(it.kind === "clock" || it.kind === "calendar") && (
        <Section title="Format">
          <Txt
            label=".NET format"
            mono
            value={(it as IPClockItem).format}
            onChange={(v) => set({ format: v })}
          />
          <p className="pt-1 text-[10px] text-muted-foreground">
            Tokens: HH hh mm ss tt dd MM MMM ddd yyyy (24h: H/H)
          </p>
        </Section>
      )}

      {(it.kind === "sensor" || it.kind === "table" || it.kind === "httpImage" || it.kind === "sensorImage" || it.kind === "graph" || it.kind === "bar" || it.kind === "donut" || it.kind === "gauge") && (
        <Section title="Sensor">
          {bindingFields(ops, (it as IPSensorItem).sensor, set)}
        </Section>
      )}

      {it.kind === "table" && (
        <Section title="Table">
          <Txt
            label="Format (col:px|…)"
            mono
            value={(it as IPTableItem).tableFormat}
            onChange={(v) => set({ tableFormat: v })}
          />
          <Num label="Max rows (0=all)" value={(it as IPTableItem).maxRows} onChange={(v) => set({ maxRows: v })} />
          <Chk label="Header row" value={(it as IPTableItem).showHeader} onChange={(v) => set({ showHeader: v })} />
        </Section>
      )}

      {(it.kind === "image" || it.kind === "httpImage") && (
        <Section title="Image">
          {it.kind === "image" && (
            <Txt
              label="Asset file"
              mono
              value={(it as IPImageItem).filePath}
              onChange={(v) => set({ filePath: v })}
            />
          )}
          {it.kind === "httpImage" && (
            <Txt label="URL" mono value={(it as IPHttpImageItem).httpUrl} onChange={(v) => set({ httpUrl: v })} />
          )}
          <Num label="Scale %" value={(it as IPImageItem).scale} onChange={(v) => set({ scale: v })} />
          <div className="flex gap-2">
            <div className="flex-1">
              <Num label="Width" value={(it as IPImageItem).width} onChange={(v) => set({ width: v })} />
            </div>
            <div className="flex-1">
              <Num label="Height" value={(it as IPImageItem).height} onChange={(v) => set({ height: v })} />
            </div>
          </div>
          <Chk label="Tint layer" value={(it as IPImageItem).layer} onChange={(v) => set({ layer: v })} />
          {(it as IPImageItem).layer && (
            <Col label="Layer color" value={(it as IPImageItem).layerColor} onChange={(v) => set({ layerColor: v })} />
          )}
          <Chk label="Video panel" value={(it as IPImageItem).showPanel} onChange={(v) => set({ showPanel: v })} />
          {(it as IPImageItem).showPanel && (
            <Num label="Volume" value={(it as IPImageItem).volume} onChange={(v) => set({ volume: v })} />
          )}
        </Section>
      )}

      {it.kind === "sensorImage" && (
        <Section title="Sensor Image">
          <Txt label="Asset file" mono value={(it as IPSensorImageItem).filePath} onChange={(v) => set({ filePath: v })} />
          <Num label="T1" value={(it as IPSensorImageItem).threshold1} onChange={(v) => set({ threshold1: v })} />
          <Num label="T2" value={(it as IPSensorImageItem).threshold2} onChange={(v) => set({ threshold2: v })} />
          <p className="text-[11px] text-muted-foreground">Shown while value ∈ [T1, T2].</p>
          <Num label="Scale %" value={(it as IPSensorImageItem).scale} onChange={(v) => set({ scale: v })} />
        </Section>
      )}

      {(it.kind === "graph" || it.kind === "bar" || it.kind === "donut") && (
        <ChartSection it={it as IPGraphItem | IPBarItem | IPDonutItem} set={set} />
      )}

      {it.kind === "gauge" && (
        <Section title="Gauge">
          <Num label="Min" value={(it as IPGaugeItem).minValue} onChange={(v) => set({ minValue: v })} />
          <Num label="Max" value={(it as IPGaugeItem).maxValue} onChange={(v) => set({ maxValue: v })} />
          <Num label="Scale %" value={(it as IPGaugeItem).scale} onChange={(v) => set({ scale: v })} />
          <Num label="Anim (frames/s)" value={(it as IPGaugeItem).animationSpeed} onChange={(v) => set({ animationSpeed: v })} />
          <Chk label="Flip X" value={(it as IPGaugeItem).flipX} onChange={(v) => set({ flipX: v })} />
          <Txt
            label="Frames (1/line)"
            mono
            value={(it as IPGaugeItem).images.map((f) => f.filePath).join("\n")}
            onChange={(v) => {
              const prev = (it as IPGaugeItem).images;
              set({
                images: v
                  .split("\n")
                  .filter(Boolean)
                  .map((name, i) =>
                    prev[i] ? { ...prev[i], filePath: name } : { ...prev[0], filePath: name, id: `${(it as IPGaugeItem).id}-f${i}` }
                  ),
              });
            }}
          />
        </Section>
      )}

      {it.kind === "shape" && (
        <ShapeSection it={it as IPShapeItem} set={set} />
      )}

      {it.kind === "group" && (
        <Section title="Group">
          <p className="text-[11px] text-muted-foreground">
            {(it as IPGroupItem).children.length} children (absolute coords
            preserved). Ungroup from the toolbar to splice them back out.
          </p>
        </Section>
      )}
    </div>
  );
}

function ChartSection({
  it,
  set,
}: {
  it: IPGraphItem | IPBarItem | IPDonutItem;
  set: (patch: Record<string, unknown>) => void;
}) {
  return (
    <Section title="Chart">
      <div className="flex gap-2">
        <div className="flex-1">
          <Num label="Width" value={it.width} onChange={(v) => set({ width: v })} />
        </div>
        <div className="flex-1">
          <Num label="Height" value={it.height} onChange={(v) => set({ height: v })} />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Num label="Min" value={it.min} onChange={(v) => set({ min: v })} />
        </div>
        <div className="flex-1">
          <Num label="Max" value={it.max} onChange={(v) => set({ max: v })} />
        </div>
      </div>
      <Chk label="Auto range" value={it.autoValue} onChange={(v) => set({ autoValue: v })} />
      <Chk label="Frame" value={it.frame} onChange={(v) => set({ frame: v })} />
      {it.frame && <Col label="Frame color" value={it.frameColor} onChange={(v) => set({ frameColor: v })} />}
      <Chk label="Background" value={it.background} onChange={(v) => set({ background: v })} />
      {it.background && <Col label="BG color" value={it.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />}
      <Col label="Series color" value={it.color} onChange={(v) => set({ color: v })} />
      {it.kind === "graph" && (
        <>
          <Num label="Thickness" value={(it as IPGraphItem).thickness} onChange={(v) => set({ thickness: v })} />
          <Num label="Step px" value={(it as IPGraphItem).step} onChange={(v) => set({ step: v })} />
          <Chk label="Fill" value={(it as IPGraphItem).fill} onChange={(v) => set({ fill: v })} />
          {(it as IPGraphItem).fill && (
            <Col label="Fill color" value={(it as IPGraphItem).fillColor} onChange={(v) => set({ fillColor: v })} />
          )}
        </>
      )}
      {it.kind === "bar" && (
        <>
          <Num label="Corner" value={(it as IPBarItem).cornerRadius} onChange={(v) => set({ cornerRadius: v })} />
          <Chk label="Gradient" value={(it as IPBarItem).gradient} onChange={(v) => set({ gradient: v })} />
          {(it as IPBarItem).gradient && (
            <Col label="Gradient to" value={(it as IPBarItem).gradientColor} onChange={(v) => set({ gradientColor: v })} />
          )}
        </>
      )}
      {it.kind === "donut" && (
        <>
          <Num label="Thickness" value={(it as IPDonutItem).thickness} onChange={(v) => set({ thickness: v })} />
          <Num label="Span °" value={(it as IPDonutItem).span} onChange={(v) => set({ span: v })} />
        </>
      )}
      {("flipX" in it) && (
        <Chk label="Flip X" value={it.flipX} onChange={(v) => set({ flipX: v })} />
      )}
    </Section>
  );
}

function ShapeSection({ it, set }: { it: IPShapeItem; set: (p: Record<string, unknown>) => void }) {
  const shapes: IPShapeType[] = [
    "Rectangle",
    "RoundedRect",
    "Ellipse",
    "Triangle",
    "Capsule",
    "Star",
    "Plus",
    "Arrow",
    "Trapezoid",
    "Parallelogram",
    "Hexagon",
  ];
  return (
    <Section title="Shape">
      <select
        value={it.shapeType}
        onChange={(e) => set({ shapeType: e.target.value })}
        className="mb-1 w-full rounded-md border bg-popover px-1 py-1 text-xs"
      >
        {shapes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <div className="flex-1">
          <Num label="Width" value={it.width} onChange={(v) => set({ width: v })} />
        </div>
        <div className="flex-1">
          <Num label="Height" value={it.height} onChange={(v) => set({ height: v })} />
        </div>
      </div>
      <Num label="Corner radius" value={it.cornerRadius} onChange={(v) => set({ cornerRadius: v })} />
      <Chk label="Fill" value={it.showFill} onChange={(v) => set({ showFill: v })} />
      {it.showFill && <Col label="Fill color" value={it.fillColor} onChange={(v) => set({ fillColor: v })} />}
      <Chk label="Frame" value={it.showFrame} onChange={(v) => set({ showFrame: v })} />
      {it.showFrame && (
        <>
          <Num label="Frame thickness" value={it.frameThickness} onChange={(v) => set({ frameThickness: v })} />
          <Col label="Frame color" value={it.frameColor} onChange={(v) => set({ frameColor: v })} />
        </>
      )}
      <Chk label="Gradient" value={it.showGradient} onChange={(v) => set({ showGradient: v })} />
      {it.showGradient && (
        <>
          <Col label="Gradient from" value={it.gradientColor} onChange={(v) => set({ gradientColor: v })} />
          <Col label="Gradient to" value={it.gradientColor2} onChange={(v) => set({ gradientColor2: v })} />
        </>
      )}
    </Section>
  );
}

function ProfileFields({
  ops,
  onProfile,
}: {
  ops: FreeStudioOps;
  onProfile?: (patch: Partial<IPProfile>) => void;
}) {
  const p = ops.profile;
  const set = (patch: Partial<IPProfile>) => (onProfile ?? ops.patchProfile)(patch);
  return (
    <div>
      <Section title="Profile">
        <Txt label="Name" value={p.name} onChange={(v) => set({ name: v })} />
        <div className="flex gap-2">
          <div className="flex-1">
            <Num label="Width" value={p.width} onChange={(v) => set({ width: Math.max(50, v) })} />
          </div>
          <div className="flex-1">
            <Num label="Height" value={p.height} onChange={(v) => set({ height: Math.max(50, v) })} />
          </div>
        </div>
        <Txt label="Font" value={p.font} onChange={(v) => set({ font: v })} />
        <Num label="Font size" value={p.fontSize} onChange={(v) => set({ fontSize: v })} />
        <Num label="Font scale" value={p.fontScale} step={0.05} onChange={(v) => set({ fontScale: v })} />
        <Col label="Text color" value={p.color} onChange={(v) => set({ color: v })} />
        <Col label="Background" value={p.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
      </Section>
      <Section title="Window">
        <Chk label="Show FPS" value={p.showFps} onChange={(v) => set({ showFps: v })} />
        <Chk label="Draggable" value={p.drag} onChange={(v) => set({ drag: v })} />
        <Chk label="Resizable" value={p.resize} onChange={(v) => set({ resize: v })} />
        <Chk label="Active" value={p.active} onChange={(v) => set({ active: v })} />
        <Chk label="Topmost" value={p.topmost} onChange={(v) => set({ topmost: v })} />
        <Chk
          label="Strict window match"
          value={p.strictWindowMatching}
          onChange={(v) => set({ strictWindowMatching: v })}
        />
        <div className="flex gap-2">
          <div className="flex-1">
            <Num label="Window X" value={p.windowX} onChange={(v) => set({ windowX: v })} />
          </div>
          <div className="flex-1">
            <Num label="Window Y" value={p.windowY} onChange={(v) => set({ windowY: v })} />
          </div>
        </div>
      </Section>
    </div>
  );
}
