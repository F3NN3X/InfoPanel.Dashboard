import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";
import { imageUrl } from "@/lib/image";
import { byName, groupByContainer, liveText } from "@/lib/sensors";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.InfoPanel.StreamDeck.";

/**
 * StreamDeck module — Elgato Stream Deck profiles (StreamDeck plugin).
 * One container per connected device (serial). Each button has a label
 * entry (`btn-<serial>-<col,row>`) and an icon entry
 * (`btn-icon-<serial>-<col,row>` whose value is the plugin's local
 * image server URL, or "-" when the button has no icon.
 */
interface DeckButton {
  col: number;
  row: number;
  label?: string;
  icon?: string;
  key: string;
}

function parseCoords(suffix: string): { col: number; row: number } {
  const comma = suffix.indexOf(",");
  if (comma < 0) return { col: 0, row: 0 };
  const col = parseInt(suffix.slice(0, comma), 10) || 0;
  const row = parseInt(suffix.slice(comma + 1), 10) || 0;
  return { col, row };
}

export const streamdeckModule: DashboardModule = {
  id: "streamdeck",
  title: "Stream Deck",
  minCols: 3,
  minRows: 2,
  prefixes: [P],
  settings: [
    { key: "showProfile", label: "Active profile", type: "boolean", default: true },
    { key: "showLabels", label: "Button labels", type: "boolean", default: true },
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(streamdeckModule, s);
    const groups = [...groupByContainer(sensors, P).entries()];
    if (groups.length === 0) return null;

    return (
      <div className="grid h-full w-full auto-rows-fr grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map(([serial, items]) => {
          const deviceName = liveText(byName(items, "Device Name")) ?? serial;
          const profile = liveText(byName(items, "Active Profile"));

          // Pair icon entries with their label entries (same <serial>-<col,row> suffix).
          const iconItems = items.filter((i) => i.key.includes(".btn-icon-"));
          const buttons: DeckButton[] = iconItems.map((icon) => {
            const suffix = icon.key.slice(icon.key.lastIndexOf("btn-icon-") + "btn-icon-".length);
            const labelKey = icon.key.replace(".btn-icon-", ".btn-");
            const label = sensors[labelKey];
            const { col, row } = parseCoords(suffix);
            const iconUrl = liveText(icon.sensor);
            return {
              col,
              row,
              key: icon.key,
              label: liveText(label),
              icon: imageUrl(iconUrl, icon.key),
            };
          });
          buttons.sort((a, b) => a.row - b.row || a.col - b.col);

          if (buttons.length === 0) {
            // No icon entries (icons only exist once the deck is polled) —
            // show profile info only.
            if (!cfg.showProfile || !profile) return null;
            return (
              <Card
                key={serial}
                className="flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card"
              >
                <CardHeader className="shrink-0 pb-2">
                  <CardTitle className="truncate text-sm font-medium text-muted-foreground" title={deviceName}>
                    {deviceName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 items-center">
                  {profile && <div className="text-sm text-foreground/85">{profile}</div>}
                </CardContent>
              </Card>
            );
          }

          const cols = buttons.length <= 15 ? 5 : 6;

          return (
            <Card
              key={serial}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden border-border bg-card"
            >
              <CardHeader className="shrink-0 pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="truncate" title={deviceName}>
                    {deviceName}
                  </span>
                  {cfg.showProfile && profile && (
                    <span className="ml-auto max-w-40 truncate text-xs font-normal text-muted-foreground" title={profile}>
                      {profile}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col">
                <div
                  className="grid flex-1 auto-rows-fr gap-2"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {buttons.map((b) => (
                    <div
                      key={b.key}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted p-2"
                      title={b.label ?? `Button R${b.row + 1}:C${b.col + 1}`}
                    >
                      <div className="flex aspect-square w-full items-center justify-center">
                        {b.icon ? (
                          <img
                            src={b.icon}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                        )}
                      </div>
                      {cfg.showLabels && (
                        <div className="w-full truncate text-center text-[10px] text-muted-foreground">
                          {b.label ?? `R${b.row + 1}:C${b.col + 1}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  },
};
