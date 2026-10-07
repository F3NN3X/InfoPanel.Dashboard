import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Download,
  PanelRightClose,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemePanel } from "./theme-panel";
import {
  defaultConfig,
  newProfile,
  uid,
  CARDS_ID,
  type DashboardConfig,
  type MonitorProfile,
} from "@/lib/layout";
import { modules } from "@/modules";
import { THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ALL_MODULES = [
  ...modules.map((m) => ({ id: m.id, title: m.title })),
  { id: CARDS_ID, title: "Other sensors" },
];

interface StudioToolbarProps {
  config: DashboardConfig;
  /** The resolved (active) profile being edited. */
  profile: MonitorProfile;
  studio: boolean;
  windowWidth: number;
  windowHeight: number;
  setConfig: Dispatch<SetStateAction<DashboardConfig>>;
  onEnterStudio: () => void;
  onExitStudio: () => void;
}

/**
 * The studio entry point (floating wrench) and the editor drawer:
 * profile management, module palette, theme, and config import/export.
 */
export function StudioToolbar({
  config,
  profile,
  studio,
  windowWidth,
  windowHeight,
  setConfig,
  onEnterStudio,
  onExitStudio,
}: StudioToolbarProps) {
  const [open, setOpen] = useState(studio);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setOpen(studio), [studio]);

  const updateProfile = (fn: (p: MonitorProfile) => MonitorProfile) => {
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.map((p) => (p.id === profile.id ? fn(p) : p)),
    }));
  };

  const addPlacement = (module: string, colSpan: number) => {
    updateProfile((p) => ({
      ...p,
      placements: [
        ...p.placements,
        { id: uid(module), module, colSpan, visible: true },
      ],
    }));
  };

  const addProfile = () => {
    const profile2 = newProfile(
      `${windowWidth}×${windowHeight}`,
      windowWidth,
      windowHeight
    );
    setConfig((c) => ({
      ...c,
      profiles: [...c.profiles, profile2],
      activeProfile: profile2.id,
    }));
  };

  const removeProfile = () => {
    if (config.profiles.length <= 1) return;
    setConfig((c) => ({
      ...c,
      profiles: c.profiles.filter((p) => p.id !== profile.id),
      activeProfile: "auto",
    }));
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "infopanel-dashboard-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file: File) => {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Partial<DashboardConfig>;
        if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
          throw new Error("Missing profiles");
        }
        setConfig({ ...defaultConfig(), ...parsed } as DashboardConfig);
      } catch (err) {
        console.error("Failed to import dashboard config", err);
      }
    });
  };

  const placed = new Set(profile.placements.map((p) => p.module));

  return (
    <>
      {/* Floating entry button */}
      <button
        onClick={() => (studio ? setOpen((o) => !o) : onEnterStudio())}
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-full border bg-popover p-2.5 shadow-lg transition-opacity",
          studio
            ? "text-foreground"
            : "text-muted-foreground opacity-50 hover:opacity-100"
        )}
        title={studio ? "Toggle studio panel" : "Open dashboard studio"}
      >
        {open && studio ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
      </button>

      {open && (
        <aside className="fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l bg-popover text-popover-foreground shadow-2xl">
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Dashboard studio</span>
            </div>
            {studio && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={onExitStudio}
              >
                Kiosk view
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {/* Profile */}
            <section className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Monitor profile
              </div>
              <select
                value={config.activeProfile}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, activeProfile: e.target.value }))
                }
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="auto">Auto (match window)</option>
                {config.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">
                  Name
                  <input
                    value={profile.name}
                    onChange={(e) =>
                      updateProfile((p) => ({ ...p, name: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <label>
                    Width
                    <input
                      type="number"
                      value={profile.width}
                      onChange={(e) =>
                        updateProfile((p) => ({
                          ...p,
                          width: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                  <label>
                    Height
                    <input
                      type="number"
                      value={profile.height}
                      onChange={(e) =>
                        updateProfile((p) => ({
                          ...p,
                          height: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                    />
                  </label>
                </div>
                <label className="text-xs text-muted-foreground">
                  Columns
                  <input
                    type="number"
                    min={2}
                    max={24}
                    value={profile.cols}
                    onChange={(e) =>
                      updateProfile((p) => ({
                        ...p,
                        cols: Math.max(
                          2,
                          Math.min(24, parseInt(e.target.value, 10) || 12)
                        ),
                      }))
                    }
                    className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="flex items-end gap-2 text-xs text-muted-foreground">
                  <span className="pb-1">Fit mode</span>
                  <select
                    value={profile.fit}
                    onChange={(e) =>
                      updateProfile((p) => ({
                        ...p,
                        fit: e.target.value === "fill" ? "fill" : "scroll",
                      }))
                    }
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm text-foreground"
                  >
                    <option value="scroll">Scroll</option>
                    <option value="fill">Fill viewport</option>
                  </select>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={addProfile}
                >
                  <Plus className="h-3 w-3" /> New profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={removeProfile}
                  disabled={config.profiles.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </section>

            {/* Modules */}
            <section className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Add module
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_MODULES.filter((m) => !placed.has(m.id)).map((m) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      addPlacement(m.id, m.id === CARDS_ID ? profile.cols : 6)
                    }
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                  >
                    <Plus className="mr-1 inline h-3 w-3" />
                    {m.title}
                  </button>
                ))}
                {ALL_MODULES.every((m) => placed.has(m.id)) && (
                  <span className="text-xs text-muted-foreground/60">
                    all modules placed
                  </span>
                )}
              </div>
            </section>

            {/* Theme */}
            <section className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Theme
              </div>
              <ThemePanel
                tokens={config.theme}
                radius={config.radius}
                presetName={
                  THEME_PRESETS.find(
                    (p) => JSON.stringify(p.tokens) === JSON.stringify(config.theme)
                  )?.name ?? "custom"
                }
                onToken={(key, value) =>
                  setConfig((c) => ({
                    ...c,
                    theme: { ...c.theme, [key]: value } as ThemeTokens,
                  }))
                }
                onRadius={(radius) => setConfig((c) => ({ ...c, radius }))}
                onPreset={(name) => {
                  const preset = THEME_PRESETS.find((p) => p.name === name);
                  if (preset) {
                    setConfig((c) => ({ ...c, theme: { ...preset.tokens } }));
                  }
                }}
              />
            </section>

            {/* Data */}
            <section className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Config
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={exportConfig}
                >
                  <Download className="mr-1 h-3 w-3" /> Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-1 h-3 w-3" /> Import
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={() => setConfig(defaultConfig())}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Reset
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importConfig(file);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground/60">
                Layouts, profiles and theme are saved in this browser
                (localStorage) and can be shared as a JSON file.
              </p>
            </section>
          </div>

          {studio && (
            <div className="border-t p-3">
              <Badge variant="secondary" className="text-xs">
                {profile.name} · {profile.width}×{profile.height} ·{" "}
                {profile.cols} cols
              </Badge>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
