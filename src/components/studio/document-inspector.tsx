import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import type { PageBackground } from "@/lib/appearance";
import type { GeneralSettings } from "@/lib/general";
import type { MonitorProfile } from "@/lib/layout";
import { THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import type { ModuleSettings } from "@/modules/types";
import { AppearanceGallery } from "./appearance-gallery";
import { GlobalStyleScope, type AppearanceTarget } from "./appearance-panel";
import { BackgroundPanel, type BackgroundTarget } from "./background-panel";
import { DataApiPanel } from "./data-api-panel";
import { generalCards } from "./general-panel";
import { InspectorNote, InspectorView, type SectionParts } from "./inspector/inspector-view";
import { AutoPick, ProfileFields, ProfileInherit } from "./inspector/profile-sections";
import { HeaderSlot } from "./inspector-layout";
import {
  globalStyleValues,
  inspectorNotes,
  isVisible,
  type InspectorContext,
  type InspectorSection,
} from "./inspector-model";
import { ProfileThemePanel, type ProfileTheme } from "./profile-theme-panel";
import type { FieldsApi } from "./settings-panel";
import { dropKeys } from "./settings-model";
import type { LayoutMode } from "./studio-layout";
import { ThemePanel } from "./theme-panel";
import type { AppearancePresetsApi } from "./use-appearance-presets";
import { DashboardHeader } from "./zone-inspector-parts";
import { shownValue, shownValues } from "./inspector/zone-fields";
import { PROFILE_STYLE_SETTINGS } from "@/modules/standard-settings";

/** The parts of the dashboard inspector the palette's "Appearance…" and friends jump to. */
export type DocumentTab = "appearance" | "background" | "general" | "connection";

/** The section each part jumps to (its document card id). */
export const DOCUMENT_CARD: Record<DocumentTab, string> = {
  appearance: "doc:appearance",
  background: "doc:background",
  general: "doc:type",
  connection: "doc:connection",
};

export interface DocumentInspectorProps {
  /** Open, reveal and outline a section whenever `seq` changes (the palette's document commands). */
  jumpTo?: { id: string; seq: number };
  theme: ThemeTokens;
  radius: number;
  onToken: (key: keyof ThemeTokens, value: string) => void;
  onRadius: (radius: number) => void;
  onThemePreset: (name: string) => void;
  /** The dashboard style (defaults for every widget of every profile). */
  dashboardStyle: ModuleSettings | undefined;
  dashboardEnforce: boolean | undefined;
  onStyle: (target: AppearanceTarget, fn: (style: ModuleSettings) => ModuleSettings) => void;
  onEnforce: (target: AppearanceTarget, value: boolean | undefined) => void;
  /** The appearance presets gallery. */
  presets: AppearancePresetsApi;
  /** The dashboard's page background (every profile without its own). */
  background: PageBackground | undefined;
  /** The active profile (its own background and style, and its name). */
  profile: {
    id: string;
    name: string;
    background?: PageBackground;
    style?: ModuleSettings;
    styleEnforce?: boolean;
    theme?: Partial<ThemeTokens>;
    radius?: number;
  };
  /** Set the active profile's own theme colours / radius (both unset = inherit). */
  onProfileTheme: (next: ProfileTheme, key?: string) => void;
  onBackground: (target: BackgroundTarget, bg: PageBackground | undefined) => void;
  /** General settings (font, clock, locale, motion, kiosk cursor). */
  general: GeneralSettings | undefined;
  onGeneral: <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => void;
  dataApiUrl: string | undefined;
  onDataApiUrl: (url: string) => void;
}

/** What the Profile and General tabs edit besides the document props. */
export interface DashboardStudioProps {
  /** The active profile, whole (Profile tab). */
  activeProfile: MonitorProfile;
  updateProfile: (fn: (p: MonitorProfile) => MonitorProfile, key?: string) => void;
  canRemoveProfile: boolean;
  onRemoveProfile: () => void;
  /** The config picks the profile by window size ("auto"). */
  autoPick: boolean;
  onAutoPick: (auto: boolean) => void;
  /** General › Studio: the inspector position. */
  layoutMode: LayoutMode;
  onLayoutMode: (mode: LayoutMode) => void;
}

const INSPECTOR_POSITIONS = [
  { value: "side" as const, label: "Side" },
  { value: "bottom" as const, label: "Bottom" },
  { value: "auto" as const, label: "Auto", title: "Bottom for wide, short profiles; else beside the canvas" },
];

/**
 * The inspector with nothing selected: the Dashboard, in the tabs Profile ·
 * Appearance · Global style · General (README §4.7), with the same
 * sections, dots, search and Advanced filter as a zone. The registry
 * places the existing cards (scope and force, presets, theme, page
 * background, general, connection) into its sections.
 */
export function DocumentInspector(props: DocumentInspectorProps & DashboardStudioProps) {
  // Remount per profile: the scope starts where this profile has its own settings.
  return <DocumentSheet key={props.profile.id} {...props} />;
}

function DocumentSheet({
  jumpTo,
  theme,
  radius,
  onToken,
  onRadius,
  onThemePreset,
  dashboardStyle,
  dashboardEnforce,
  onStyle,
  onEnforce,
  presets,
  background,
  profile,
  onProfileTheme,
  onBackground,
  general,
  onGeneral,
  dataApiUrl,
  onDataApiUrl,
  activeProfile,
  updateProfile,
  canRemoveProfile,
  onRemoveProfile,
  autoPick,
  onAutoPick,
  layoutMode,
  onLayoutMode,
}: DocumentInspectorProps & DashboardStudioProps) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<AppearanceTarget>(
    profile.style || profile.styleEnforce !== undefined ? "profile" : "all"
  );
  const all = target === "all";
  const scope = all ? "All profiles" : "This profile";
  const context: InspectorContext = { kind: "dashboard", scope: target, profileName: profile.name };

  const change = (fn: (style: ModuleSettings) => ModuleSettings) => onStyle(target, fn);
  const values = globalStyleValues(target, dashboardStyle, profile.style);
  const fields: FieldsApi = {
    values,
    shown: (key, def) => shownValue(values, key, def),
    onChange: (key, v) => change((s) => ({ ...s, [key]: v })),
    onPatch: (patch) => change((s) => ({ ...s, ...patch })),
    onClear: (keys) => change((s) => dropKeys(s, new Set(keys)) ?? {}),
  };
  const effective = shownValues(values, PROFILE_STYLE_SETTINGS);
  const generalById = new Map(generalCards(general, onGeneral).map((c) => [c.id, c] as const));

  const parts = (s: InspectorSection): SectionParts => {
    switch (s.special) {
      case "profileFields":
        return {
          body: (
            <ProfileFields
              profile={activeProfile}
              updateProfile={updateProfile}
              canRemove={canRemoveProfile}
              onRemove={onRemoveProfile}
            />
          ),
        };
      case "profileInherit":
        return {
          body: (
            <ProfileInherit
              profile={activeProfile}
              dashboardTheme={{ theme, radius }}
              dashboardBackground={background}
              onProfileTheme={onProfileTheme}
              onBackground={onBackground}
              updateProfile={updateProfile}
            />
          ),
        };
      case "profileSelection":
        return { body: <AutoPick auto={autoPick} onAuto={onAutoPick} /> };
      case "scope":
        return {
          body: (
            <GlobalStyleScope
              target={target}
              onTarget={setTarget}
              profileName={profile.name}
              dashboardEnforce={dashboardEnforce}
              profileEnforce={profile.styleEnforce}
              onEnforce={onEnforce}
            />
          ),
        };
      case "presets":
        return { badge: scope, body: <AppearanceGallery api={presets} target={target} /> };
      case "theme":
        return {
          badge: scope,
          body: all ? (
            <ThemePanel
              tokens={theme}
              radius={radius}
              presetName={
                THEME_PRESETS.find((p) => JSON.stringify(p.tokens) === JSON.stringify(theme))?.name ?? "custom"
              }
              onToken={onToken}
              onRadius={onRadius}
              onPreset={onThemePreset}
            />
          ) : (
            <ProfileThemePanel
              dashboard={{ theme, radius }}
              profile={{ theme: profile.theme, radius: profile.radius }}
              profileName={profile.name}
              onChange={onProfileTheme}
            />
          ),
        };
      case "pageBackground":
        return {
          body: (
            <BackgroundPanel
              dashboard={background}
              profileBackground={profile.background}
              profileName={profile.name}
              onChange={onBackground}
            />
          ),
        };
      case "type":
      case "clock":
      case "display": {
        const card = s.cardId ? generalById.get(s.cardId) : undefined;
        return card ? { body: card.node, changed: card.changed, onReset: card.onReset } : {};
      }
      case "studio":
        return {
          body: (
            <div className="space-y-1">
              <span className="text-[12.5px] text-ui-2">Inspector position</span>
              <Segmented
                label="Inspector position"
                options={INSPECTOR_POSITIONS}
                value={layoutMode}
                onChange={onLayoutMode}
                className="w-full *:flex-1"
              />
            </div>
          ),
        };
      case "connection":
        return { body: <DataApiPanel value={dataApiUrl} onChange={onDataApiUrl} /> };
      default:
        return { badge: scope };
    }
  };

  const notes = (tab: Parameters<typeof inspectorNotes>[1]) =>
    inspectorNotes(context, tab).map((n) => <InspectorNote key={n.kind}>{n.text}</InspectorNote>);

  return (
    <InspectorView
      context={context}
      contextKey="dashboard"
      header={
        <HeaderSlot className="w-80 shrink-0">
          <DashboardHeader profileName={profile.name} />
        </HeaderSlot>
      }
      fields={fields}
      visible={(def) => isVisible(def, effective)}
      parts={parts}
      notes={notes}
      query={query}
      onQuery={setQuery}
      jumpTo={jumpTo}
    />
  );
}
