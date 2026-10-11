import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { PROFILE_STYLE_SETTINGS } from "@/modules/standard-settings";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { DataApiPanel } from "./data-api-panel";
import { dropKeys, filterSettings } from "./settings-model";
import { SettingsPanel } from "./settings-panel";
import { ThemePanel } from "./theme-panel";
import { SettingsSearch } from "./zone-inspector-parts";

export type DocumentTab = "theme" | "profile" | "connection";

interface DocumentInspectorProps {
  /** The open tab (kept by the studio so it survives selecting a zone). */
  tab: DocumentTab;
  onTabChange: (tab: DocumentTab) => void;
  theme: ThemeTokens;
  radius: number;
  onToken: (key: keyof ThemeTokens, value: string) => void;
  onRadius: (radius: number) => void;
  onThemePreset: (name: string) => void;
  /** The active profile's style (defaults for every widget). */
  profileStyle: ModuleSettings | undefined;
  onProfileStyle: (fn: (style: ModuleSettings) => ModuleSettings) => void;
  dataApiUrl: string | undefined;
  onDataApiUrl: (url: string) => void;
}

const TABS = [
  { value: "theme" as const, label: "Theme" },
  { value: "profile" as const, label: "Profile style" },
  { value: "connection" as const, label: "Connection" },
];

/** "Profile style › Colors & type" — where a search result lives. */
function breadcrumb(def: ModuleSetting): string {
  return def.group ? `Profile style › ${def.group}` : "Profile style";
}

/**
 * Right panel with nothing selected: a hint, then Theme, Profile style
 * (searchable, defaults for every widget) and Connection (Data API) tabs.
 */
export function DocumentInspector({
  tab,
  onTabChange,
  theme,
  radius,
  onToken,
  onRadius,
  onThemePreset,
  profileStyle,
  onProfileStyle,
  dataApiUrl,
  onDataApiUrl,
}: DocumentInspectorProps) {
  return (
    <section>
      <div className="sticky top-0 z-10 space-y-2.5 border-b bg-popover p-3">
        <p className="text-xs text-muted-foreground">
          Select a zone to edit it — or set the theme, profile style and
          connection here.
        </p>
        <Segmented options={TABS} value={tab} onChange={onTabChange} className="w-full *:flex-1" />
      </div>

      <div className="p-4">
        {tab === "theme" ? (
          <ThemePanel
            tokens={theme}
            radius={radius}
            presetName={
              THEME_PRESETS.find(
                (p) => JSON.stringify(p.tokens) === JSON.stringify(theme)
              )?.name ?? "custom"
            }
            onToken={onToken}
            onRadius={onRadius}
            onPreset={onThemePreset}
          />
        ) : tab === "profile" ? (
          <ProfileStyleTab value={profileStyle} onChange={onProfileStyle} />
        ) : (
          <>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Data API URL
            </div>
            <DataApiPanel value={dataApiUrl} onChange={onDataApiUrl} />
          </>
        )}
      </div>
    </section>
  );
}

/** The profile's style settings with a search box over them. */
function ProfileStyleTab({
  value,
  onChange,
}: {
  value: ModuleSettings | undefined;
  onChange: (fn: (style: ModuleSettings) => ModuleSettings) => void;
}) {
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const defs = searching ? filterSettings(PROFILE_STYLE_SETTINGS, query) : PROFILE_STYLE_SETTINGS;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground/70">
        Defaults for every widget in this profile; a widget&apos;s own
        setting overrides them.
      </p>
      <SettingsSearch query={query} onQuery={setQuery} />
      <SettingsPanel
        title={searching ? "Results" : "Profile style"}
        sectionScope="profile"
        defs={defs}
        value={value}
        breadcrumb={searching ? breadcrumb : undefined}
        onChange={(key, v) => onChange((s) => ({ ...s, [key]: v }))}
        onClear={(key) => onChange((s) => dropKeys(s, new Set([key])) ?? {})}
        onReset={searching ? undefined : () => onChange(() => ({}))}
      />
      {searching && defs.length === 0 && (
        <div className="py-6 text-center text-xs text-muted-foreground/70">No settings match</div>
      )}
    </div>
  );
}
