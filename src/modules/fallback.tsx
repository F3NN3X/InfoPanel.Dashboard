import { SmartValue } from "@/components/SmartValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SensorValue } from "@/hooks/useSensors";

/**
 * Generic card for sensor keys no registered module claimed — new plugins
 * that don't have a dedicated module render here automatically. Image URL
 * values (cover art, icons, banners) render as <img>; multi-line values
 * (flattened tables) render line by line.
 */
export function GenericCard({
  sensorKey,
  sensor,
}: {
  sensorKey: string;
  sensor: SensorValue;
}) {
  const title = sensor.name ?? sensorKey;
  const display =
    sensor.text !== undefined
      ? sensor.text
      : sensor.value !== undefined
        ? `${sensor.value.toFixed(1)}${sensor.unit}`
        : undefined;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle
          className="truncate text-sm font-medium text-muted-foreground"
          title={title}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {display !== undefined ? (
          <div className="max-h-48 overflow-y-auto">
            <SmartValue
              value={display}
              keyHint={sensorKey}
              className="text-lg font-semibold tracking-tight text-foreground"
              imgClassName="max-h-48 w-full rounded-md object-contain"
            />
          </div>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-foreground">—</div>
        )}
        {sensor.source && (
          <div className="mt-2 text-xs text-muted-foreground/60">{sensor.source}</div>
        )}
      </CardContent>
    </Card>
  );
}
