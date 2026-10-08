import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  Group,
  Layers,
  LockOpen,
  MousePointerClick,
  Redo2,
  Trash2,
  Undo2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardConfig } from "@/lib/layout";
import type { SensorMap } from "@/modules";
import type { IPGroupItem, IPItem, IPItemKind, IPProfile } from "@/lib/ip/types";
import { IP_KIND_LABEL } from "@/lib/ip/types";
import {
  itemsToXml,
  parseItemsXml,
  parseProfileXml,
  profileToXml,
  zipFind,
} from "@/lib/ip/xml";
import { bytesToBlob, slugify, unzip, zipStore, type ZipFile } from "@/lib/ip/zip";
import {
  addItem,
  duplicateItem,
  findItem,
  groupItems,
  newIPId,
  removeItem,
  ungroupItem,
  updateItem,
  zOrderItem,
} from "@/lib/ip/ops";
import { flattenItems } from "@/components/ip/ip-canvas";
import { renderItem, cssColor } from "@/components/ip/items";
import { FreeInspector, type FreeStudioOps } from "./free-inspector";
import { BUILD_ID } from "@/lib/buildInfo";

const KINDS: IPItemKind[] = [
  "text",
  "clock",
  "calendar",
  "sensor",
  "table",
  "image",
  "httpImage",
  "sensorImage",
  "graph",
  "bar",
  "donut",
  "gauge",
  "shape",
  "group",
];

/** Rough render box (design px) for selection chrome. */
function itemBox(item: IPItem, profile: IPProfile): { w: number; h: number } {
  switch (item.kind) {
    case "text":
    case "clock":
    case "calendar":
    case "sensor":
    case "table": {
      const fs = item.fontSize * profile.fontScale;
      return {
        w: item.width > 0 ? item.width : 240,
        h: item.height > 0 ? item.height : Math.ceil(fs * 1.4),
      };
    }
    case "image":
    case "httpImage": {
      const f = (item.scale > 0 ? item.scale : 100) / 100;
      return {
        w: item.width > 0 ? item.width * f : 150,
        h: item.height > 0 ? item.height * f : 100,
      };
    }
    case "graph":
    case "bar":
    case "donut":
      return { w: item.width, h: item.height };
    case "gauge":
      return { w: item.scale > 0 ? item.scale : 100, h: item.scale > 0 ? item.scale : 100 };
    case "sensorImage":
      return { w: item.scale > 0 ? item.scale : 100, h: item.scale > 0 ? item.scale : 100 };
    case "shape":
      return { w: item.width, h: item.height };
    case "group": {
      const box = itemBoxOfGroup(item, profile);
      return box;
    }
  }
}

function itemBoxOfGroup(g: IPGroupItem, profile: IPProfile): { w: number; h: number } {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of g.children) {
    const b = c.kind === "group" ? itemBoxOfGroup(c, profile) : itemBox(c, profile);
    x1 = Math.min(x1, c.x);
    y1 = Math.min(y1, c.y);
    x2 = Math.max(x2, c.x + b.w);
    y2 = Math.max(y2, c.y + b.h);
  }
  if (!isFinite(x1)) return { w: 0, h: 0 };
  return { w: x2 - x1, h: y2 - y1 };
}

const ZOOM_MIN = 0.1, ZOOM_MAX = 3;

interface FreeStudioProps {
  sensors: SensorMap;
  config: DashboardConfig;
  /** The free profile being edited (config.freeProfiles entry). */
  profile: IPProfile;
  setConfig: Dispatch<SetStateAction<DashboardConfig>>;
  windowWidth: number;
  windowHeight: number;
  onExitStudio: () => void;
}

/**
 * The free-canvas studio — a 1:1 editor for InfoPanel profiles:
 * absolute placement, groups, per-item typography, live sensor
 * bindings. Left: palette + profile settings. Center: zoomable canvas
 * with select/drag/resize. Right: per-kind inspector.
 */
export function FreeStudio({
  sensors,
  profile,
  setConfig,
  windowWidth,
  windowHeight,
  onExitStudio,
}: FreeStudioProps) {
  // Working copy — written back to the config on every change.
  const [p, setP] = useState<IPProfile>(profile);
  const pRef = useRef(p);
  pRef.current = p;

  const [selId, setSelId] = useState<string | null>(null);
  const [multi, setMulti] = useState<ReadonlySet<string>>(new Set());
  const [zoom, setZoom] = useState(0.5);
  const [fitting, setFitting] = useState(true);

  // 50-deep undo/redo (snapshot stack, InfoPanel parity).
  const pastRef = useRef<IPProfile[]>([]);
  const futureRef = useRef<IPProfile[]>([]);
  const [, setHistVersion] = useState(0);

  const commit = (fn: (cur: IPProfile) => IPProfile) => {
    const next = fn(pRef.current);
    pastRef.current = [...pastRef.current.slice(-49), pRef.current];
    futureRef.current = [];
    setP(next);
    setHistVersion((v) => v + 1);
  };
  const beginLive = () => {
    pastRef.current = [...pastRef.current.slice(-49), pRef.current];
    futureRef.current = [];
    setHistVersion((v) => v + 1);
  };
  const undo = () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current = [pRef.current, ...futureRef.current];
    setP(prev);
    setHistVersion((v) => v + 1);
  };
  const redo = () => {
    const next = futureRef.current.shift();
    if (!next) return;
    pastRef.current = [...pastRef.current, pRef.current];
    setP(next);
    setHistVersion((v) => v + 1);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canUndo = pastRef.current.length > 0, canRedo = futureRef.current.length > 0;

  // Write-through: replace the entry in config.freeProfiles.
  useEffect(() => {
    setConfig((c) => ({
      ...c,
      freeProfiles: (c.freeProfiles ?? []).map((f) => (f.id === p.id ? p : f)),
    }));
  }, [p, setConfig]);

  // Fit the canvas to the viewport on mount / profile switch.
  useEffect(() => {
    if (!fitting) return;
    const z = Math.min(
      1,
      (windowWidth - 480) / p.width,
      (windowHeight - 160) / p.height
    );
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z * 100) / 100)));
  }, [p.id, p.width, p.height, windowWidth, windowHeight, fitting]);

  // Nudge cycle (InfoPanel: 1 → 5 → 10 → 20 → 1 …).
  const nudgeRef = useRef({ step: 1, timer: 0 });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!selId) return;
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = dirs[e.key];
      if (!d) return;
      e.preventDefault();
      const n = nudgeRef.current;
      const step = e.shiftKey ? 20 : n.step;
      commit((cur) => {
        const ids = multi.size > 0 ? [...multi] : [selId];
        let next = cur;
        for (const id of ids) {
          const it = findItem(pRef.current.items, id);
          if (!it) continue;
          next = updateItem(next, id, {
            x: it.x + d[0] * step,
            y: it.y + d[1] * step,
          });
        }
        return next;
      });
      n.step = n.step === 1 ? 5 : n.step === 5 ? 10 : n.step === 10 ? 20 : 1;
      window.clearTimeout(n.timer);
      n.timer = window.setTimeout(() => (n.step = 1), 800);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, multi]);

  const flat = useMemo(() => flattenItems(p.items), [p.items]);
  const selected = selId ? (findItem(p.items, selId) ?? null) : null;
  const selSet = selId ? (multi.size > 0 ? multi : new Set([selId])) : new Set<string>();

  const patchProfile = (patch: Partial<IPProfile>) =>
    commit((cur) => ({ ...cur, ...patch }));
  const patchItem = (id: string, patch: Record<string, unknown>) =>
    commit((cur) => updateItem(cur, id, patch));

  /* ---------------- canvas drag / resize ---------------- */

  const dragRef = useRef<{
    mode: "move" | "resize";
    id: string;
    startX: number;
    startY: number;
    orig: { x: number; y: number; w: number; h: number };
    liveIds: string[];
  } | null>(null);

  const snap = (v: number) => Math.round(v / 5) * 5;

  const onItemDown = (
    e: React.PointerEvent,
    item: IPItem,
    mode: "move" | "resize"
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.shiftKey && mode === "move") {
      // Shift+click toggles multi-selection.
      setSelId(item.id);
      setMulti((m) => {
        const n = new Set(m);
        if (n.has(item.id)) n.delete(item.id);
        else n.add(item.id);
        return n;
      });
      return;
    }
    setSelId(item.id);
    if (mode === "move" && item.locked) return;
    if (item.kind === "group" && mode === "move") return; // group: no free move
    const ids =
      mode === "move" && multi.size > 0 ? [...multi] : [item.id];
    beginLive();
    dragRef.current = {
      mode,
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      orig: {
        x: item.x,
        y: item.y,
        w: itemBox(item, p).w,
        h: itemBox(item, p).h,
      },
      liveIds: ids,
    };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startX) / zoom;
      const dy = (ev.clientY - d.startY) / zoom;
      if (d.mode === "move") {
        const moved = [...d.liveIds];
        for (const id of moved) {
          const it = findItem(pRef.current.items, id);
          if (!it) continue;
          const nx = Math.max(0, snap(d.orig.x + dx));
          const ny = Math.max(0, snap(d.orig.y + dy));
          setP((cur) => updateItem(cur, id, { x: nx, y: ny }));
        }
      } else {
        const nw = Math.max(5, snap(d.orig.w + dx));
        const nh = Math.max(5, snap(d.orig.h + dy));
        setP((cur) => updateItem(cur, d.id, { width: nw, height: nh }));
      }
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------------- ops ---------------- */

  const ops: FreeStudioOps = {
    sensors,
    patchItem,
    patchProfile,
    selected,
    profile: p,
  };

  const toolbarBtn = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    disabled?: boolean
  ) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border bg-popover text-popover-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-40"
    >
      {icon}
    </button>
  );

  /* ---------------- .infopanel round-trip ---------------- */

  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** Asset file names referenced anywhere in the tree. */
  const collectAssetNames = (items: IPItem[]): Set<string> => {
    const out = new Set<string>();
    const walk = (list: IPItem[]) => {
      for (const it of list) {
        if (it.kind === "image" || it.kind === "sensorImage") {
          if (it.filePath) out.add(it.filePath);
        } else if (it.kind === "gauge") {
          for (const f of it.images) if (f.filePath) out.add(f.filePath);
        } else if (it.kind === "group") walk(it.children);
      }
    };
    walk(items);
    return out;
  };

  const toB64 = (bytes: Uint8Array): string => {
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  };

  /** Export `{name}-{unixtime}.infopanel` — opens unchanged in InfoPanel. */
  const exportInfopanel = async () => {
    setBusy("Export");
    try {
      const enc = new TextEncoder();
      const files: ZipFile[] = [
        { name: "Profile.xml", data: new Uint8Array(enc.encode(profileToXml(p))) },
        { name: "DisplayItems.xml", data: new Uint8Array(enc.encode(itemsToXml(p.items))) },
      ];
      const base = `/assets/ip/${p.assets ?? p.id}`;
      for (const name of collectAssetNames(p.items)) {
        try {
          const r = await fetch(`${base}/${encodeURIComponent(name)}`);
          if (r.ok)
            files.push({ name: `assets/${name}`, data: new Uint8Array(await r.arrayBuffer()) });
        } catch {
          /* asset not served at runtime — the XML references it by name */
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(bytesToBlob(zipStore(files), "application/zip"));
      a.download = `${slugify(p.name)}-${Math.floor(Date.now() / 1000)}.infopanel`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      setBusy(null);
    }
  };

  /** Import a `.infopanel` bundle (InfoPanel export, or one we exported). */
  const importInfopanel = async (file: File) => {
    setBusy("Import");
    try {
      const files = await unzip(new Uint8Array(await file.arrayBuffer()));
      const dec = new TextDecoder();
      const pXml = zipFind(files, "Profile.xml");
      const iXml = zipFind(files, "DisplayItems.xml");
      if (!pXml || !iXml)
        throw new Error("not a .infopanel bundle (missing Profile.xml / DisplayItems.xml)");
      const prof = parseProfileXml(dec.decode(pXml));
      const items = parseItemsXml(dec.decode(iXml), (i) => `${newIPId()}-${i}`);
      // Bundled assets → in-memory data URLs (served to the renderer via
      // `profile.assetData` — no disk access needed in the kiosk).
      const assetData: Record<string, string> = {};
      for (const [key, v] of files) {
        const lower = key.toLowerCase();
        if (!lower.startsWith("assets/")) continue;
        const name = key.slice(key.indexOf("/") + 1);
        const mime = lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : lower.endsWith(".gif")
            ? "image/gif"
            : lower.endsWith(".webp")
              ? "image/webp"
              : "image/png";
        assetData[name] = `data:${mime};base64,${toB64(v)}`;
      }
      const id = newIPId();
      const np: IPProfile = {
        id,
        name: `[Import] ${prof.name ?? file.name.replace(/\.infopanel$/i, "")}`,
        width: prof.width ?? 800,
        height: prof.height ?? 600,
        backgroundColor: prof.backgroundColor ?? "#00FFFFFF",
        font: prof.font ?? "",
        fontSize: prof.fontSize ?? 26,
        fontScale: prof.fontScale ?? 1.33,
        color: prof.color ?? "#FFFFFFFF",
        showFps: prof.showFps ?? false,
        drag: true,
        resize: false,
        active: true,
        topmost: true,
        windowX: 0,
        windowY: 0,
        strictWindowMatching: false,
        assets: id,
        assetData: Object.keys(assetData).length > 0 ? assetData : undefined,
        items,
      };
      setConfig((c) => ({
        ...c,
        freeProfiles: [...(c.freeProfiles ?? []), np],
        activeProfile: id,
      }));
    } catch (e) {
      console.error("[free-studio] import failed:", e);
    } finally {
      setBusy(null);
    }
  };

  const ids = selSet.size > 0 ? [...selSet] : [];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Button variant="ghost" size="sm" onClick={onExitStudio}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold tracking-tight">
          {p.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {p.width}×{p.height} · free canvas (InfoPanel 1:1)
        </span>
        <div className="mx-2 h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          {toolbarBtn(<Undo2 className="h-4 w-4" />, "Undo (Ctrl+Z)", undo, !canUndo)}
          {toolbarBtn(<Redo2 className="h-4 w-4" />, "Redo (Ctrl+Y)", redo, !canRedo)}
        </div>
        <div className="mx-2 h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          {selId &&
            toolbarBtn(
              <LockOpen className="h-4 w-4" />,
              selected?.locked ? "Unlock" : "Lock",
              () =>
                patchItem(selId, {
                  locked: !(findItem(p.items, selId)?.locked ?? false),
                })
            )}
          {selId &&
            toolbarBtn(
              selected?.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />,
              selected?.hidden ? "Show" : "Hide",
              () =>
                patchItem(selId, { hidden: !(findItem(p.items, selId)?.hidden ?? false) })
            )}
          {selId &&
            toolbarBtn(
              <ChevronUp className="h-4 w-4" />,
              "Forward (up in Z)",
              () => ids.forEach((id) => commit((cur) => zOrderItem(cur, id, "forward")))
            )}
          {selId &&
            toolbarBtn(
              <ChevronDown className="h-4 w-4" />,
              "Backward (down in Z)",
              () => ids.forEach((id) => commit((cur) => zOrderItem(cur, id, "backward")))
            )}
          {selId &&
            toolbarBtn(
              <Layers className="h-4 w-4" />,
              "Bring to front",
              () => ids.forEach((id) => commit((cur) => zOrderItem(cur, id, "front")))
            )}
          {selId &&
            toolbarBtn(
              <Group className="h-4 w-4" />,
              "Group selection",
              () => {
                const next = groupItems(p, ids);
                if (next.items.length !== p.items.length || next.items !== p.items)
                  commit(() => next);
              }
            )}
          {selId && selected?.kind === "group" &&
            toolbarBtn(
              <Group className="h-4 w-4 rotate-180" />,
              "Ungroup",
              () => commit((cur) => ungroupItem(cur, selId!))
            )}
          {selId &&
            toolbarBtn(
              <Copy className="h-4 w-4" />,
              "Duplicate (Ctrl+D)",
              () => ids.forEach((id) => commit((cur) => duplicateItem(cur, id)))
            )}
          {selId &&
            toolbarBtn(
              <Trash2 className="h-4 w-4" />,
              "Delete",
              () => {
                const next = ids.reduce(
                  (acc, id) => removeItem(acc, id),
                  p
                );
                commit(() => next);
                setSelId(null);
                setMulti(new Set());
              }
            )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            title="Import a .infopanel bundle"
            className="flex items-center gap-1 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm hover:bg-accent disabled:opacity-40"
          >
            <Upload className="h-3.5 w-3.5" />
            {busy === "Import" ? "…" : "Import"}
          </button>
          <button
            onClick={exportInfopanel}
            disabled={busy !== null}
            title="Export this profile as .infopanel"
            className="flex items-center gap-1 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm hover:bg-accent disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            {busy === "Export" ? "…" : "Export"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".infopanel,.zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importInfopanel(f);
              e.target.value = "";
            }}
          />
          <div className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={() => setFitting(true)}
            title="Fit to viewport"
            className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm hover:bg-accent"
          >
            Fit
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - 0.25) * 100) / 100))}
            title="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-md border bg-popover shadow-sm hover:bg-accent"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + 0.25) * 100) / 100))}
            title="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-md border bg-popover shadow-sm hover:bg-accent"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="ml-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            build {BUILD_ID}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: palette + profile settings */}
        <aside className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r p-3">
          <section>
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Add item
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() =>
                    commit((cur) =>
                      addItem(
                        cur,
                        k,
                        Math.round(p.width / 2 - 100),
                        Math.round(p.height / 2 - 40)
                      )
                    )
                  }
                  className="flex items-center gap-1.5 rounded-md border bg-popover px-2 py-1.5 text-xs shadow-sm hover:bg-accent"
                >
                  <MousePointerClick className="h-3 w-3 text-muted-foreground" />
                  {IP_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </section>
          <FreeInspector
            mode="profile"
            ops={ops}
            onProfile={(patch) => patchProfile(patch)}
          />
        </aside>

        {/* Center: canvas */}
        <main className="relative flex-1 overflow-auto bg-muted/40 p-8">
          <div
            className="relative mx-auto shadow-2xl"
            style={{
              width: p.width * zoom,
              height: p.height * zoom,
              background: cssColor(p.backgroundColor) ?? "transparent",
              overflow: "hidden",
            }}
          >
            {/* 1:1 content, scaled */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: p.width,
                height: p.height,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {flat.map((item) => renderItem(item, { profile: p, sensors, assetBase: `/assets/ip/${p.assets ?? p.id}`, now: new Date() }))}
            </div>

            {/* Selection chrome (screen space) */}
            {flat
              .filter((i) => !i.hidden)
              .map((item) => {
                const box = itemBox(item, p);
                const isSel = selSet.has(item.id);
                return (
                  <div
                    key={item.id}
                    onPointerDown={(e) => onItemDown(e, item, "move")}
                    className={cn(
                      "absolute",
                      isSel
                        ? "z-50 cursor-move ring-2 ring-sky-400"
                        : "cursor-move",
                      item.locked && "opacity-80"
                    )}
                    style={{
                      left: item.x * zoom,
                      top: item.y * zoom,
                      width: Math.max(8, box.w * zoom),
                      height: Math.max(8, box.h * zoom),
                    }}
                  >
                    {isSel && (
                      <>
                        <div
                          className="pointer-events-none absolute -inset-0.5 border border-dashed border-sky-400/60"
                        />
                        <span className="pointer-events-none absolute -top-4 left-0 text-[9px] font-medium text-sky-300">
                          {item.name || item.kind}
                        </span>
                        {(item.kind === "graph" || item.kind === "bar" || item.kind === "donut" || item.kind === "shape" || item.kind === "image" || item.kind === "httpImage" || item.kind === "gauge") && (
                          <div
                            onPointerDown={(e) => onItemDown(e, item, "resize")}
                            className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-sky-400 bg-white"
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </main>

        {/* Right: inspector */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l p-3">
          <FreeInspector mode="item" ops={ops} />
        </aside>
      </div>
    </div>
  );
}
