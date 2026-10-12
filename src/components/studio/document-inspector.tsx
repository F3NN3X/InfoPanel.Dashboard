import { useState } from "react";
import { PROFILE_STYLE_SETTINGS } from "@/modules/standard-settings";
import type { ModuleSettings } from "@/modules/types";
import type { PageBackground } from "@/lib/appearance";
import type { GeneralSettings } from "@/lib/general";
import type { StyleSource } from "@/lib/style-resolve";
import { THEME_PRESETS, type ThemeTokens } from "@/lib/theme";
import { AppearanceGallery } from "./appearance-gallery";
import { GlobalStyleScope, type AppearanceTarget } from "./appearance-panel";
import { BackgroundPanel, type BackgroundTarget } from "./background-panel";
import { CategorySheet, type SheetCard, type SheetGroup } from "./category-sheet";
import { DataApiPanel } from "./data-api-panel";
import { generalCards } from "./general-panel";
import { categorize, filterCategories } from "./inspector-categories";
import { HeaderSlot, InspectorHeader, useInspectorLayout } from "./inspector-layout";
import { ProfileThemePanel, type ProfileTheme } from "./profile-theme-panel";
import { dropKeys, matchesQuery } from "./settings-model";
import { ThemePanel } from "./theme-panel";
import type { AppearancePresetsApi } from "./use-appearance-presets";
import { SettingsSearch } from "./zone-inspector-parts";

/** The parts of the document sheet (the palette's "Appearance…" and friends jump to them). */
export type DocumentTab = "appearance" | "background" | "general" | "connection";

/** The card each part jumps to. */
export const DOCUMENT_CARD: Record<DocumentTab, string> = {
  appearance: "doc:appearance",
  background: "doc:background",
  general: "doc:type",
  connection: "doc:connection",
};

export interface DocumentInspectorProps {
  /** Scroll to a card whenever `seq` changes (the palette's document commands). */
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

/**
 * Right panel with nothing selected, as one sheet like a zone's: the
 * global style (scope switch and force, the presets gallery, then the style
 * in the same categories as a widget's), the page (theme colors, background),
 * General (font, clock, motion, kiosk cursor) and Connection (Data API).
 * The scope switch sits in the first card; theme colors follow it, the
 * background card has its own.
 */
export function DocumentInspector(props: DocumentInspectorProps) {
  // Remount per profile: the scopes start where this profile has its own settings.
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
}: DocumentInspectorProps) {
  const dock = useInspectorLayout() === "dock";
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const [target, setTarget] = useState<AppearanceTarget>(
    profile.style || profile.styleEnforce !== undefined ? "profile" : "all"
  );
  const all = target === "all";
  const change = (fn: (style: ModuleSettings) => ModuleSettings) => onStyle(target, fn);
  // This profile inherits the dashboard style (its rows' dots say so).
  const inherited = all ? undefined : dashboardStyle;
  const inheritedFrom = inherited
    ? Object.fromEntries(Object.keys(inherited).map((k): [string, StyleSource] => [k, "dashboard"]))
    : undefined;
  const scope = all ? "all profiles" : "this profile";

  const visible = (cards: SheetCard[]) => (searching ? cards.filter((c) => matchesQuery(c.terms, query)) : cards);
  const groupsOf = (list: SheetGroup[]) =>
    list.map((g) => ({ ...g, cards: visible(g.cards) })).filter((g) => g.cards.length > 0);

  const leading = groupsOf([
    {
      heading: "Appearance",
      cards: [
        {
          id: "doc:appearance",
          title: "Global style",
          badge: scope,
          hint: "The defaults every widget starts from; choose whether you edit all profiles or this one",
          terms: ["Global style", "Appearance", "All profiles", "This profile", "Force global style", "Scope"],
          node: (
            <GlobalStyleScope
              target={target}
              onTarget={setTarget}
              profileName={profile.name}
              dashboardEnforce={dashboardEnforce}
              profileEnforce={profile.styleEnforce}
              onEnforce={onEnforce}
            />
          ),
        },
        {
          id: "doc:presets",
          title: "Presets",
          badge: scope,
          hint: "Whole looks: theme colors, style and background",
          wide: true,
          terms: ["Presets", "Look", "Theme", "Save current as preset"],
          node: <AppearanceGallery api={presets} target={target} />,
        },
      ],
    },
  ]);
  const groups = groupsOf([
    {
      heading: "Page",
      cards: [
        {
          id: "doc:theme",
          title: "Theme colors",
          badge: scope,
          hint: "The dashboard's colors and corner radius; a profile can use its own",
          terms: ["Theme colors", "Theme", "Colors", "Radius", "Accent"],
          node: all ? (
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
        },
        {
          id: "doc:background",
          title: "Background",
          hint: "The page behind the grid (a color, gradient, image or video)",
          terms: ["Background", "Page background", "Color", "Gradient", "Image", "Video"],
          node: (
            <BackgroundPanel
              dashboard={background}
              profileBackground={profile.background}
              profileName={profile.name}
              onChange={onBackground}
            />
          ),
        },
      ],
    },
    { heading: "General", cards: generalCards(general, onGeneral) },
    {
      heading: "Connection",
      cards: [
        {
          id: "doc:connection",
          title: "Data API URL",
          hint: "Where the dashboard reads live sensor data",
          terms: ["Connection", "Data API", "URL", "Test connection", "API index"],
          node: <DataApiPanel value={dataApiUrl} onChange={onDataApiUrl} />,
        },
      ],
    },
  ]);

  const base = categorize(PROFILE_STYLE_SETTINGS);
  const sheet = (
    <CategorySheet
      categories={searching ? filterCategories(base, query) : base}
      moduleTitle=""
      generalTitle="Global style"
      badge={scope}
      openByDefault
      openAll={searching}
      value={all ? dashboardStyle : profile.style}
      inherited={inherited}
      inheritedFrom={inheritedFrom}
      onChange={(key, v) => change((s) => ({ ...s, [key]: v }))}
      onPatch={(patch) => change((s) => ({ ...s, ...patch }))}
      onClear={(keys) => change((s) => dropKeys(s, new Set(keys)) ?? {})}
      leading={leading}
      groups={groups}
      jumpTo={jumpTo}
    />
  );

  return (
    <section className={dock ? "flex h-full min-h-0 flex-col" : undefined}>
      <InspectorHeader side="sticky top-0 z-10 space-y-2.5 border-b bg-popover p-3">
        <HeaderSlot className="min-w-60 flex-1">
          <p className="text-xs text-muted-foreground">
            Select a zone to edit it — or set the appearance, background, general settings and connection here.
          </p>
        </HeaderSlot>
        <HeaderSlot className="w-56 shrink-0">
          <SettingsSearch query={query} onQuery={setQuery} />
        </HeaderSlot>
      </InspectorHeader>
      {dock ? sheet : <div className="p-4">{sheet}</div>}
    </section>
  );
}
