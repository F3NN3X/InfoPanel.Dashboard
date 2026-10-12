import { SmartValue } from "@/components/SmartValue";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ModernChrome } from "@/components/modern-chrome";
import { StyledCard } from "@/components/styled-card";
import type { SensorValue } from "@/hooks/useSensors";

/**
 * Generic card for sensor keys no registered module claimed — new plugins
 * that don't have a dedicated module render here automatically. Image URL
 * values (cover art, icons, banners) render as <img>; multi-line values
 * (flattened tables) render line by line. The card follows the zone's
 * style (`StyledCard`); the zone wraps the grid in its `ModernChrome`.
 */
export function GenericCard({
  sensorKey,
  sensor,
  surface,
  chrome,
}: {
  sensorKey: string;
  sensor: SensorValue;
  /** The zone's resolved `surface` setting (default: the theme card). */
  surface?: unknown;
  chrome?: ModernChrome;
}) {
  const title = sensor.name ?? sensorKey;
  const display =
    sensor.text !== undefined
      ? sensor.text
      : sensor.value !== undefined
        ? `${sensor.value.toFixed(1)}${sensor.unit}`
        : undefined;

  return (
    <StyledCard surface={surface ?? "theme"} chrome={chrome}>
      <CardHeader className="shrink-0 pb-2">
        <CardTitle
          className="truncate text-sm font-medium text-muted-foreground"
          title={title}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {display !== undefined ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
            <SmartValue
              value={display}
              keyHint={sensorKey}
              className="text-lg font-semibold tracking-tight text-foreground"
              imgClassName="max-h-40 w-auto rounded-md object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-2xl font-bold tracking-tight text-foreground">
            —
          </div>
        )}
        {sensor.source && (
          <div className="mt-2 text-xs text-muted-foreground/60">{sensor.source}</div>
        )}
      </CardContent>
    </StyledCard>
  );
}
