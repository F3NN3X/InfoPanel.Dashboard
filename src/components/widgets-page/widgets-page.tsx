// The Widgets page (Phase 5b; sidebar between Library and Gauges, built like Gauges: browse and a builder view). Browse lists the
// user widgets the server holds (/api/widgets: Yours, saved from the builder here; Imported, from a package file) and the
// built-ins; Import reads a package (.zip), the validator's errors shown in plain words before anything is stored; Export writes
// one. The builder edits recipes and stores them through the same route. A lazy studio chunk: nothing here is in the kiosk entry.
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Plus, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarFill, BarTitle, PageBar } from "@/components/studio/page-bar";
import { WidgetStage } from "@/components/studio/add-preview";
import { moduleItem } from "@/components/studio/add-catalog";
import { ALL_MODULES, type ModuleMeta } from "@/components/studio/studio-modules";
import { builtinPresets, useWidgetPresets } from "@/components/studio/widget-presets";
import { useStoredFlag } from "@/components/studio/use-stored-flag";
import { sensorName } from "@/components/studio/widget-kinds";
import * as studio from "@/components/studio/studio-actions";
import type { StudioBridge } from "@/components/library/library-actions";
import { download } from "@/components/infopanel/export-dialog";
import { useSensors } from "@/hooks/useSensors";
import { withHwinfoAliases } from "@/lib/hwinfo-aliases";
import { CARDS_ID } from "@/lib/layout";
import type { Appearance } from "@/lib/style-resolve";
import { modules } from "@/modules";
import { STANDARD_KEYS } from "@/modules/standard-settings";
import type { ModuleSettings } from "@/modules/types";
import type { Data } from "@/widgets/core/types";
import { exportPackage, importPackage, packageOf } from "@/widgets/recipe/package";
import { isRecipeId } from "@/widgets/recipe/resolve";
import { listUserWidgets, loadRecipe, readPackage, removeWidget, storePackage } from "@/widgets/recipe/store";
import type { PackageFile, Recipe } from "@/widgets/recipe/types";
import { checkPackage } from "@/widgets/recipe/validate";
import { toFlat } from "@/widgets/shared/data-adapter";
import { blockCount, duplicateRecipe, newRecipe, nextVersion, presetValues, recipeIdFor, valueText, withSample } from "./builder-model";
import type { Draft } from "./builder";
import { commit, historyOf, redo, undo } from "./history";
import { START, whyNoStart } from "./start-points";
import { storedValues } from "./recipe-preview";
import { WidgetDetail, type WidgetDetailProps } from "./widget-detail";
import { WidgetsBrowse, type BuiltInEntry } from "./widgets-browse";
import { counts, kindLine, screensLine, shown, usesOf, type UserWidget, type WidgetFilter } from "./widgets-model";

/** The builder comes with its first open. */
const Builder = lazy(() => import("./builder").then((m) => ({ default: m.Builder })));

/** The dev fixtures' code widgets (`?fixture=widgets/<state>`, dev and fixtures builds only: a release build drops the import). */
const FIXTURES = import.meta.env.DEV || import.meta.env.VITE_DEV_FIXTURES === "1";
const fixtureState = (): string | undefined => (FIXTURES ? /^widgets\/(.+)$/.exec(new URLSearchParams(window.location.search).get("fixture") ?? "")?.[1] : undefined);

/** "Third-party code widgets": a local switch, on by default (code widgets arrive in Phase 6, signed). */
export const THIRD_PARTY_KEY = "studio.widgets.thirdParty";

export interface WidgetsPageProps {
  bridge: StudioBridge;
  appearance?: Appearance;
  pageStyle?: CSSProperties;
  /** Edit, after Add to a screen. */
  onShowEdit: () => void;
  onOpenSources: () => void;
}

/** A recipe's card line: its description's first words. */
const blurbOf = (r: Recipe): string => r.description?.split(/[.:]/)[0] ?? r.name;

/** Built-ins on the page: every registered widget, in the registry's order. */
const BUILT_INS: ModuleMeta[] = ALL_MODULES.filter((m) => m.id !== CARDS_ID && !isRecipeId(m.id));
/** A built-in's own settings, from its module. */
const settingsOf = (id: string) => modules.find((m) => m.id === id)?.settings ?? [];

/** A widget package file's name for a recipe. */
const fileName = (r: Recipe): string => `${r.id.slice(7)}-${r.version}.widget.zip`;

export default function WidgetsPage({ bridge, appearance, pageStyle, onShowEdit, onOpenSources }: WidgetsPageProps) {
  const presetMap = useWidgetPresets();
  const [user, setUser] = useState<UserWidget[]>([]);
  const [notice, setNotice] = useState<string>();
  const [importError, setImportError] = useState<{ file: string; lines: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WidgetFilter>("all");
  const [allBuiltIns, setAllBuiltIns] = useState(false);
  const [thirdParty, setThirdParty] = useStoredFlag(THIRD_PARTY_KEY, true);
  const [selected, setSelected] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = bridge.toast;
  // the live readings a save writes into the recipe's sample (only while the builder is open)
  const sensors = useSensors(active ? null : []);
  const liveData = useMemo(() => toFlat(withHwinfoAliases(sensors)) as Data, [sensors]);

  const refresh = async (select?: string) => {
    const { list, off } = await listUserWidgets();
    const loaded = await Promise.all(
      list.map(async (w): Promise<UserWidget> => {
        const l = await loadRecipe(w.id);
        const r = l.recipe;
        return { id: w.id, name: r?.name ?? w.name, kind: "recipe", yours: w.origin === "studio", recipe: r, issues: l.issues, trust: { kind: "recipe" }, blurb: r ? blurbOf(r) : w.name, version: w.version, bytes: w.size };
      }),
    );
    const state = fixtureState();
    const fixtures = state ? (await import("@/dev/fixtures/widgets")).widgetFixtures() : [];
    setUser([...loaded, ...fixtures]);
    setNotice(off ? "User widgets are switched off on this server (USER_WIDGETS=off): nothing can be imported or stored." : undefined);
    if (select) setSelected(select);
    else if (state) setSelected((s) => s ?? (fixtureSelection(state, loaded, fixtures)));
  };
  useEffect(() => {
    void refresh();
  }, []);

  const uses = (id: string) => usesOf(bridge.config, id);
  const visible = user.filter((w) => (thirdParty || w.kind !== "code") && shown(w, filter, query));
  const builtIns: BuiltInEntry[] = BUILT_INS.filter((m) => shown({ kind: "recipe", yours: false, name: m.title }, "all", query)).map((m) => ({ id: m.id, name: m.title, icon: m.icon, presets: builtinPresets(m, presetMap).length }));
  const c = counts(user.filter((w) => thirdParty || w.kind !== "code"), BUILT_INS.length);

  /* ───────── adding to the screen in Edit ───────── */

  const addZone = (module: string, name: string, size: [number, number], settings?: ModuleSettings) => {
    const id = `zone-${Math.random().toString(36).slice(2, 10)}`;
    let placed = false;
    bridge.updateProfile((p) => {
      const next = studio.addModulePlacement(p, id, module, { cols: size[0], rows: size[1] });
      placed = next.placements.some((z) => z.id === id);
      return settings ? { ...next, placements: next.placements.map((z) => (z.id === id ? { ...z, settings } : z)) } : next;
    });
    if (!placed) return toast("No free space: resize or remove a widget first");
    bridge.select(id);
    toast(`Added ${name} to ${bridge.profile.name}`);
    onShowEdit();
  };
  const addRecipe = (r: Recipe, presetId?: string | null) => {
    const preset = r.presets.find((p) => p.id === presetId) ?? r.presets.find((p) => p.default);
    const values = preset?.default ? {} : storedValues(r, Object.fromEntries(Object.entries(presetValues(r, preset)).filter(([k]) => preset?.settings[k] !== undefined)));
    addZone(r.id, r.name, preset?.size ?? r.size.default, { recipeVersion: r.version, ...values });
  };

  /* ───────── import and export ───────── */

  const importFile = async (file: File) => {
    try {
      const { files, skipped } = await importPackage(new Uint8Array(await file.arrayBuffer()));
      const checked = await checkPackage({ files });
      const errors = checked.issues.filter((i) => i.severity === "error");
      if (errors.length || !checked.recipe) {
        setImportError({ file: file.name, lines: [...errors.slice(0, 6).map((i) => `${i.file ? `${i.file}: ` : ""}${i.message}`), ...(skipped.length ? [`Left out, not part of a widget package: ${skipped.slice(0, 4).join(", ")}`] : [])] });
        return;
      }
      const why = await storePackage(files, "import");
      if (why) return setImportError({ file: file.name, lines: [why] });
      setImportError(null);
      toast(`Imported ${checked.recipe.name}`);
      await refresh(checked.recipe.id);
    } catch (e) {
      setImportError({ file: file.name, lines: [`It is not a widget package (.zip): ${(e as Error).message}`] });
    }
  };
  const exportStored = async (id: string, r: Recipe) => {
    const { files } = await readPackage(id);
    await download(fileName(r), exportPackage(files.length ? files : await packageOf(r)), "application/zip");
  };

  /* ───────── the builder ───────── */

  const open = (recipe: Recipe, images: PackageFile[] = [], stored?: Recipe) => {
    const key = recipe.id;
    setDrafts((list) => (list.some((d) => d.key === key) ? list : [...list, { key, history: historyOf(recipe), images, stored }]));
    setActive(key);
  };
  const taken = () => new Set([...user.map((w) => w.id), ...drafts.map((d) => d.history.present.id)]);
  const editStored = async (w: UserWidget) => {
    if (!w.recipe) return;
    const { files } = await readPackage(w.id);
    open(w.recipe, files.filter((f) => f.path.startsWith("images/")), w.recipe);
  };
  const draft = drafts.find((d) => d.key === active) ?? null;
  const setDraft = (next: Draft) => setDrafts((list) => list.map((d) => (d.key === next.key ? next : d)));
  const save = async (): Promise<Recipe | undefined> => {
    if (!draft) return;
    const changed = !draft.stored || JSON.stringify(draft.stored) !== JSON.stringify(draft.history.present);
    if (!changed) return draft.stored;
    setSaving(true);
    try {
      // A recipe takes its id from its name when first saved (renaming "New widget" is the usual first step); after that it keeps it.
      const own = draft.history.present.id;
      const id = draft.stored ? own : recipeIdFor(draft.history.present.name, new Set([...taken()].filter((t) => t !== own)));
      const rekey = (r: Recipe): Recipe => (r.id === id ? r : { ...r, id });
      const base = withSample(rekey(draft.history.present), liveData);
      const recipe = draft.stored && draft.stored.version === base.version ? { ...base, version: nextVersion(base.version) } : base;
      const why = await storePackage(await packageOf(recipe, draft.images), "studio");
      if (why) {
        toast(`Not saved: ${why}`);
        return undefined;
      }
      setDraft({ ...draft, history: { past: draft.history.past.map(rekey), present: recipe, future: draft.history.future.map(rekey) }, stored: recipe });
      toast(`Saved ${recipe.name}`);
      void refresh();
      return recipe;
    } finally {
      setSaving(false);
    }
  };

  if (draft)
    return (
      <Suspense fallback={<div className="flex-1 bg-ui-app" />}>
        <Builder
          drafts={drafts}
          active={draft}
          onActive={setActive}
          onEdit={(recipe, images) => setDraft({ ...draft, history: commit(draft.history, recipe), images: images ?? draft.images })}
          onUndo={() => setDraft({ ...draft, history: undo(draft.history) })}
          onRedo={() => setDraft({ ...draft, history: redo(draft.history) })}
          onBack={() => setActive(null)}
          onSave={() => void save()}
          saving={saving}
          onExport={() => void packageOf(withSample(draft.history.present, liveData), draft.images).then((files) => download(fileName(draft.history.present), exportPackage(files), "application/zip"))}
          onAddToScreen={(presetId) =>
            void save().then((r) => {
              if (r) addRecipe(r, presetId);
            })
          }
          appearance={appearance}
          pageStyle={pageStyle}
          onOpenSources={onOpenSources}
        />
      </Suspense>
    );

  /* ───────── the detail pane ───────── */

  const userDetail = (w: UserWidget): WidgetDetailProps => {
    const used = uses(w.id);
    const r = w.recipe;
    const values = r ? presetValues(r, r.presets.find((p) => p.default)) : {};
    return {
      name: w.name,
      kind: kindLine(w, r && blockCount(r)),
      trust: w.trust,
      recipe: r,
      preview: w.fixture && <span className="text-body text-ui-2">{w.fixture.preview}</span>,
      appearance,
      pageStyle,
      refused: w.kind === "recipe" && !r ? (w.issues.find((i) => i.severity === "error")?.message ?? "the check refused it") : undefined,
      onAdd: r ? { label: "Add to a screen", run: () => addRecipe(r) } : { label: "Add to a screen", run: () => {}, disabled: true, title: w.kind === "code" ? "Code widgets arrive with signatures in a later version" : "The check refused it" },
      primary: w.kind === "code" ? { label: "About", icon: "about", run: () => toast(`${w.name}: a code widget (fixture). Code widgets arrive with signatures in a later version`) } : { label: "Edit recipe", icon: "edit", run: () => void editStored(w), disabled: !r },
      onExport: r ? { label: "Export", run: () => void exportStored(w.id, r) } : { label: "Export", run: () => {}, disabled: true },
      menu: r
        ? [
            { label: "Duplicate", run: () => open(duplicateRecipe(r, `${r.name} copy`, taken())) },
            { label: "Remove", run: () => void removeWidget(w.id).then((ok) => (ok ? (setSelected(null), toast(`Removed ${w.name}`), refresh()) : toast(`Not removed: the server refused`))), disabled: used.length > 0 },
          ]
        : [],
      presets: r ? r.presets.map((p) => p.name) : (w.fixture?.presets ?? []),
      options: r ? r.options.slice(0, 6).map((o) => [o.label, o.type === "sensor" && values[o.key] ? sensorName(String(values[o.key])) : valueText(o, values[o.key])]) : (w.fixture?.options ?? []),
      screens: screensLine(used),
    };
  };
  const builtInDetail = (m: ModuleMeta): WidgetDetailProps => {
    const presets = builtinPresets(m, presetMap);
    const make = START[m.id];
    const settings = settingsOf(m.id).filter((s) => !STANDARD_KEYS.has(s.key) && s.type !== "status").slice(0, 5);
    const def = presets.find((p) => p.default)?.size ?? m.defaultSize ?? [3, 2];
    return {
      name: m.title,
      kind: `Built in · ${m.category ?? "Generic"} · ${presets.length} preset${presets.length === 1 ? "" : "s"}`,
      preview: <WidgetStage item={moduleItem(m, presets)} appearance={appearance} pageStyle={pageStyle} stage={{ w: 334, h: 182 }} />,
      onAdd: { label: "Add to a screen", run: () => addZone(m.id, m.title, def) },
      primary: make
        ? { label: "Duplicate as a recipe", icon: "duplicate", run: () => open(make(`${m.title} recipe`, taken())) }
        : { label: "Duplicate as a recipe", icon: "duplicate", run: () => {}, disabled: true, title: `Can't be a recipe: ${whyNoStart(m.id)}` },
      menu: [],
      presets: presets.map((p) => p.name),
      options: settings.map((s) => [s.label, typeof s.default === "boolean" ? (s.default ? "On" : "Off") : String(s.default || "Auto")]),
      screens: screensLine(uses(m.id)),
    };
  };
  const pick = user.find((w) => w.id === selected);
  const pickBuiltIn = BUILT_INS.find((m) => m.id === selected);
  const detail = pick ? userDetail(pick) : pickBuiltIn ? builtInDetail(pickBuiltIn) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-ui-app font-ui">
      <PageBar>
        <BarTitle title="Widgets" note={`${BUILT_INS.length} built-in · ${c.yours} yours · ${user.filter((w) => !w.yours && (thirdParty || w.kind !== "code")).length} imported`} />
        <BarFill />
        <Button icon={<Download strokeWidth={1.5} />} onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".zip,application/zip"
          aria-label="Import a widget package"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void importFile(f);
          }}
        />
        <Button variant="primary" icon={<Plus strokeWidth={1.5} />} onClick={() => open(newRecipe("New widget", taken()))}>
          New widget
        </Button>
      </PageBar>
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {importError && (
            <div role="alert" className="mx-7 mt-5 flex gap-3 rounded-ui-lg border border-ui-danger/40 bg-ui-danger/10 px-4 py-3 text-caption text-ui-2">
              <div className="min-w-0 flex-1">
                <p className="text-body text-ui-1">{importError.file} was not imported</p>
                <ul className="mt-1 list-disc pl-5">
                  {importError.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
              <button type="button" aria-label="Dismiss" onClick={() => setImportError(null)} className="self-start rounded-ui-sm p-1 text-ui-3 hover:text-ui-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <WidgetsBrowse
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            counts={c}
            thirdParty={thirdParty}
            onThirdParty={setThirdParty}
            yours={visible.filter((w) => w.yours)}
            imported={visible.filter((w) => !w.yours)}
            builtIns={builtIns}
            showBuiltIns={filter === "all"}
            allBuiltIns={allBuiltIns || !!query}
            onAllBuiltIns={() => setAllBuiltIns(true)}
            selected={selected}
            onSelect={setSelected}
            onOpen={(id) => {
              const w = user.find((x) => x.id === id);
              if (w?.recipe) void editStored(w);
            }}
            usesOf={uses}
            appearance={appearance}
            pageStyle={pageStyle}
            notice={notice}
          />
        </div>
        {detail ? (
          <WidgetDetail key={selected} {...detail} />
        ) : (
          <aside className="flex w-[380px] shrink-0 items-center justify-center border-l border-ui-subtle bg-ui-chrome p-6 text-center text-body text-ui-3">Select a widget to see it here. Double-click a recipe to edit it.</aside>
        )}
      </div>
    </div>
  );
}

/** The widget a fixture state opens on: the first recipe ("recipe"), the owner-signed or the user-key code widget. */
function fixtureSelection(state: string, loaded: readonly UserWidget[], fixtures: readonly UserWidget[]): string | null {
  if (state === "owner-signed") return fixtures.find((w) => w.trust.kind === "owner")?.id ?? null;
  if (state === "user-key") return fixtures.find((w) => w.trust.kind === "user-key")?.id ?? null;
  return loaded.find((w) => w.yours)?.id ?? loaded[0]?.id ?? null;
}
