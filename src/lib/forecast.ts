/** One day of the yr plugin's multi-day forecast. */
export interface WeatherForecastDay {
  date: string;
  desc?: string;
  high?: number;
  low?: number;
  /** mm */
  precip?: number;
  wind?: string;
}

const num = (s?: string): number | undefined => {
  const m = s?.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

/** "Thu 8 Oct, Light rain, 12 °C / 4 °C, 8.1mm, 4.5 m/s N" → day object. */
export function parseForecastLine(line: string): WeatherForecastDay {
  const parts = line.split(", ");
  const day: WeatherForecastDay = { date: parts[0] ?? line };
  if (parts[1]) day.desc = parts[1];
  const temps = parts[2]?.split(/\s*\/\s*/);
  if (temps && temps.length >= 2) {
    day.high = num(temps[0]);
    day.low = num(temps[1]);
  }
  day.precip = num(parts[3]);
  if (parts[4]) day.wind = parts[4];
  return day;
}

/** The forecast text (one day per line) → up to `days` day objects. */
export function parseForecast(text: string | undefined, days: number): WeatherForecastDay[] {
  return (text ?? "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .slice(0, days)
    .map((line) => parseForecastLine(line.trim()));
}
