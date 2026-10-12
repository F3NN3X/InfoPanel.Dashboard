import { panelTitle } from "./studio-modules";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  groupSources,
  type SourceInfo,
} from "@/lib/sources";
import { refreshCatalog, useSensorCatalog } from "@/lib/catalog";
import { getApiBase } from "@/lib/data-api";
import {
  sourcePrefKey,
  type SourcePref,
} from "@/lib/layout";
import { modules } from "@/modules";
import type { Placement } from "@/lib/layout";
import { cn } from "@/lib/utils";

interface SourcesPanelProps {
  sourcePrefs: Record<string, SourcePref> | undefined;
  onPrefsChange: (key: string, pref: Partial<SourcePref>) => void;
  /** Placements in the active profile (for the "bind to widget" action). */
  placements: Placement[];
  /** Bind the selected source to a widget placement. */
  onBind: (placementId: string, container: string) => void;
  /** Clear a widget's source binding. */
  onUnbind: (placementId: string) => void;
}

/**
 * The studio's Sources manager — an InfoPanel-style two-pane view.
 *
 * Left: every plugin the Data API exposes, with the sources (containers)
 * each pushes, as `/api/sources` names them. Search, expand, and
 * enable/disable + rename a source.
 *
 * Right: the selected source's details — its entries, a display-name
 * override, and a "bind to widget" action that points a widget at this
 * source. All dashboard-side; the host's own plugin config is untouched.
 */
export function SourcesPanel({
  sourcePrefs,
  onPrefsChange,
  placements,
  onBind,
  onUnbind,
}: SourcesPanelProps) {
  const catalog = useSensorCatalog();
  const groups = useMemo(
    () => groupSources(catalog.sources, catalog.sensors),
    [catalog.sources, catalog.sensors]
  );
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const q = search.trim().toLowerCase();
  const shownGroups = groups
    .map((g) => ({
      ...g,
      sources: q
        ? g.sources.filter(
            (s) =>
              s.label.toLowerCase().includes(q) ||
              s.id.toLowerCase().includes(q) ||
              g.name.toLowerCase().includes(q)
          )
        : g.sources,
    }))
    .filter((g) => g.sources.length > 0);

  const selected = findSource(groups, selectedKey);

  return (
    <div className="flex h-full min-h-0">
      {/* ============ LEFT: catalog ============ */}
      <div className="flex w-1/2 min-w-0 flex-col border-r border-border">
        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span className="flex-1">Sources</span>
            <button
              onClick={() => void refreshCatalog()}
              title="Reload from the Data API"
              className="rounded p-0.5 hover:text-foreground"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", catalog.status === "loading" && "animate-spin")}
              />
            </button>
            <a
              href={`${getApiBase()}/`}
              target="_blank"
              rel="noreferrer"
              title="Open the Data API index (every key, grouped by source)"
              className="rounded p-0.5 hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter plugins and sources…"
              className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {shownGroups.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground">
              {q
                ? "No sources match your filter."
                : catalog.status === "error"
                  ? "The Data API is not reachable."
                  : "No live sources yet."}
            </div>
          )}
          {shownGroups.map((g) => {
            const isCollapsed = collapsed[g.id];
            return (
              <div key={g.id} className="border-b border-border/60">
                <button
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {g.name}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {g.sources.length}
                  </span>
                </button>
                {!isCollapsed &&
                  g.sources.map((s) => {
                    const key = sourcePrefKey(s.pluginId, s.id);
                    const pref = sourcePrefs?.[key];
                    const enabled = pref?.enabled !== false;
                    const label = pref?.displayName?.trim() || s.label;
                    const isSel = selectedKey === key;
                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-1.5 pl-7",
                          isSel && "bg-accent/60"
                        )}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrefsChange(key, { enabled: !enabled });
                          }}
                          title={enabled ? "Hide source" : "Show source"}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          {enabled ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 opacity-50" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs",
                            enabled
                              ? "text-foreground"
                              : "text-muted-foreground line-through"
                          )}
                        >
                          {label}
                        </span>
                        <LiveChip source={s} />
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ RIGHT: detail ============ */}
      <div className="flex w-1/2 min-w-0 flex-col overflow-y-auto">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
            Select a source to see its details.
          </div>
        ) : (
          <SourceDetail
            source={selected}
            prefs={sourcePrefs}
            onPrefsChange={onPrefsChange}
            placements={placements}
            onBind={onBind}
            onUnbind={onUnbind}
          />
        )}
      </div>
    </div>
  );
}

function findSource(
  groups: ReturnType<typeof groupSources>,
  key: string | null
): SourceInfo | null {
  if (!key) return null;
  const [plugin, container] = splitPrefKey(key);
  const group = groups.find((g) => g.id === plugin);
  return group?.sources.find((s) => s.id === container) ?? null;
}

function splitPrefKey(key: string): [string, string] {
  const i = key.indexOf("::");
  return [key.slice(0, i), key.slice(i + 2)];
}

/** Compact live value (first numeric entry) for a source row. */
function LiveChip({ source }: { source: SourceInfo }) {
  const num = source.entries.find((e) => typeof e.value === "number");
  const txt = source.entries.find((e) => e.text && e.text.trim() !== "");
  if (num && num.value !== undefined)
    return (
      <span className="shrink-0 rounded bg-accent/60 px-1.5 py-0.5 text-[11px] tabular-nums text-foreground">
        {num.value}
        {num.unit ? ` ${num.unit}` : ""}
      </span>
    );
  if (txt?.text)
    return (
      <span className="max-w-[140px] shrink-0 truncate rounded bg-accent/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {txt.text}
      </span>
    );
  return null;
}

function SourceDetail({
  source,
  prefs,
  onPrefsChange,
  placements,
  onBind,
  onUnbind,
}: {
  source: SourceInfo;
  prefs: Record<string, SourcePref> | undefined;
  onPrefsChange: (key: string, pref: Partial<SourcePref>) => void;
  placements: Placement[];
  onBind: (placementId: string, container: string) => void;
  onUnbind: (placementId: string) => void;
}) {
  const key = sourcePrefKey(source.pluginId, source.id);
  const pref = prefs?.[key];
  const enabled = pref?.enabled !== false;
  const displayName = pref?.displayName ?? "";

  // Placements whose module can consume a source of this plugin.
  const bindable = placements.filter((p) =>
    moduleAcceptsSource(p.module, source.pluginId)
  );
  const bound = bindable.filter(
    (p) => String(p.settings?.source ?? "") === source.id
  );

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="text-sm font-medium text-foreground">
          {displayName.trim() || source.label}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {source.pluginId}
          {source.id ? ` · ${source.id}` : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Display name</span>
          <input
            value={displayName}
            onChange={(e) =>
              onPrefsChange(key, {
                displayName: e.target.value || undefined,
              })
            }
            placeholder={source.label}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50"
          />
        </label>
        <label className="flex items-end gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onPrefsChange(key, { enabled: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          <span>Show in dashboard</span>
        </label>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Entries ({source.entries.length})
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          {source.entries.map((e) => (
            <div
              key={e.key}
              className="flex items-center justify-between gap-3 border-b border-border/60 bg-background px-2.5 py-1.5 text-xs last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-1.5" title={e.key}>
                <span className="truncate text-muted-foreground">{e.label}</span>
                {e.type && e.type !== "sensor" && e.type !== "text" && (
                  <span className="shrink-0 rounded bg-accent/60 px-1 text-[10px] text-muted-foreground">
                    {e.type}
                  </span>
                )}
              </span>
              <span className="max-w-[55%] shrink-0 truncate tabular-nums text-foreground">
                {e.type === "table"
                  ? `${e.text?.split("\n").filter(Boolean).length ?? 0} rows`
                  : e.text ??
                    (e.value !== undefined
                      ? `${e.value}${e.unit ? ` ${e.unit}` : ""}`
                      : "—")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          Bind to widget
        </div>
        {bindable.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            No widgets can consume this source's plugin.
          </div>
        ) : (
          <div className="space-y-1.5">
            {bindable.map((p) => {
              const isBound = String(p.settings?.source ?? "") === source.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5",
                    isBound ? "border-accent bg-accent/30" : "border-border"
                  )}
                >
                  <span className="min-w-0 truncate text-xs text-foreground">
                    {placementTitle(p)}
                  </span>
                  {isBound ? (
                    <button
                      onClick={() => onUnbind(p.id)}
                      className="shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Unbind
                    </button>
                  ) : (
                    <button
                      onClick={() => onBind(p.id, source.id)}
                      className="shrink-0 rounded border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-accent"
                    >
                      Bind
                    </button>
                  )}
                </div>
              );
            })}
            {bound.length > 0 && (
              <div className="text-[11px] text-muted-foreground">
                {bound.length} widget{bound.length > 1 ? "s" : ""} bound to
                this source.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function placementTitle(p: Placement): string {
  if (p.panel) return panelTitle(p) || "Panel";
  const mod = modules.find((m) => m.id === p.module);
  return mod?.title ?? p.module;
}

/**
 * A placement can consume a source if its module declares a `source`
 * setting that targets this plugin (or any plugin, when unscoped).
 */
function moduleAcceptsSource(moduleId: string, plugin: string): boolean {
  const mod = modules.find((m) => m.id === moduleId);
  if (!mod) return false;
  const def = mod.settings?.find((s) => s.key === "source");
  if (!def) return false;
  if (!def.sourcePlugin) return true;
  return def.sourcePlugin === `plugins.${plugin}.`;
}
