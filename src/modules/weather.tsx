import { SmartValue } from "@/components/SmartValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Droplets, Gauge, Snowflake, Thermometer, Wind } from "lucide-react";
import { isImageUrl } from "@/lib/image";
import { findEntry, liveText } from "@/lib/sensors";
import { effectiveSettings, type DashboardModule } from "./types";

const P = "plugins.yr-weather-plugin.";

/**
 * Weather module — MET Norway (yr) via the MetYr plugin.
 * The location container id is dynamic (slug of the configured location),
 * so entries are looked up by id under the plugin prefix.
 *
 * Temperatures can legitimately be 0/negative, so raw values are used
 * (not the "0 = not live" convention).
 */
export const weatherModule: DashboardModule = {
  id: "weather",
  title: "Weather",
  matches: (key) => key.startsWith(P),
  settings: [
    { key: "showConditions", label: "Conditions card", type: "boolean", default: true },
    { key: "showForecast", label: "Forecast card", type: "boolean", default: true },
    {
      key: "forecastDays",
      label: "Forecast days",
      type: "number",
      default: 7,
      min: 1,
      max: 7,
      step: 1,
    },
  ],
  render: (sensors, s) => {
    const cfg = effectiveSettings(weatherModule, s);
    const find = (id: string) => findEntry(sensors, P, id)?.sensor;
    const text = (id: string) => liveText(find(id));
    const num = (id: string) => find(id)?.value;

    const location = text("name");
    const temp = num("temp");
    const feels = num("feels_like");
    const desc = text("weather_desc") ?? text("weather");
    const humidity = num("humidity");
    const pressure = num("pressure");
    const windSpeed = num("wind_speed");
    const windGust = num("wind_gust");
    const windDeg = num("wind_deg");
    const rain = num("rain");
    const snow = num("snow");
    const clouds = num("clouds");
    const refreshed = text("last_refreshed");
    const iconUrl = text("weather_icon_url");
    const icon = text("weather_icon");
    const forecast = text("forecast");

    if (temp === undefined && !desc) return null;

    const iconImg = iconUrl && isImageUrl(iconUrl, "weather_icon_url") ? iconUrl : undefined;
    const compass =
      windDeg !== undefined
        ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
            Math.round(((windDeg % 360) + 360) / 45) % 8
          ]
        : undefined;

    const days = Math.max(1, Math.min(7, Math.round(Number(cfg.forecastDays) || 7)));
    const forecastLines = forecast
      ?.split("\n")
      .filter((l) => l.trim() !== "")
      .slice(0, days);

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Current conditions */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {location ?? "Weather"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              {iconImg ? (
                <img
                  src={iconImg}
                  alt={desc ?? "Weather"}
                  className="h-20 w-20 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="text-5xl">{icon ?? "☀️"}</div>
              )}
              <div>
                <div className="text-5xl font-bold tracking-tight text-foreground">
                  {temp !== undefined ? `${Math.round(temp)}°` : "—"}
                </div>
                <div className="text-sm text-muted-foreground">{desc}</div>
                {feels !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    Feels like {Math.round(feels)}°
                  </div>
                )}
              </div>
            </div>
            {refreshed && (
              <div className="mt-3 text-xs text-muted-foreground/60">Updated {refreshed}</div>
            )}
          </CardContent>
        </Card>

        {/* Conditions stats */}
        {cfg.showConditions && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Condition
                icon={<Wind className="h-3.5 w-3.5" />}
                label="Wind"
                value={
                  windSpeed !== undefined
                    ? `${windSpeed.toFixed(1)} m/s${compass ? ` ${compass}` : ""}`
                    : undefined
                }
                hint={windGust !== undefined ? `Gust ${windGust.toFixed(1)} m/s` : undefined}
              />
              <Condition
                icon={<Droplets className="h-3.5 w-3.5" />}
                label="Humidity"
                value={humidity !== undefined ? `${Math.round(humidity)}%` : undefined}
              />
              <Condition
                icon={<Gauge className="h-3.5 w-3.5" />}
                label="Pressure"
                value={pressure !== undefined ? `${Math.round(pressure)} hPa` : undefined}
              />
              <Condition
                icon={<Snowflake className="h-3.5 w-3.5" />}
                label="Precip"
                value={
                  rain !== undefined || snow !== undefined
                    ? [
                        rain !== undefined && `Rain ${rain.toFixed(1)}mm`,
                        snow !== undefined && `Snow ${snow.toFixed(1)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
              />
              {clouds !== undefined && (
                <Condition
                  icon={<Cloud className="h-3.5 w-3.5" />}
                  label="Clouds"
                  value={`${Math.round(clouds)}%`}
                />
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Forecast */}
        {cfg.showForecast && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Thermometer className="h-3.5 w-3.5" /> Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecastLines && forecastLines.length > 0 ? (
              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {forecastLines.map((line, i) => {
                  const parts = line.split(", ");
                  const date = parts[0];
                  const rest = parts.slice(1).join(", ");
                  return (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <span className="shrink-0 font-medium text-foreground/85">{date}</span>
                      <span className="min-w-0 truncate text-right text-muted-foreground" title={rest}>
                        {rest}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <SmartValue value={forecast} className="text-sm text-muted-foreground" />
            )}
          </CardContent>
        </Card>
        )}
      </div>
    );
  },
};

function Condition({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">
        {value ?? "—"}
      </div>
      {hint && <div className="text-xs text-muted-foreground/60">{hint}</div>}
    </div>
  );
}
