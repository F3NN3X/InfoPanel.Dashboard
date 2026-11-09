# Weather

Current conditions and 7-day forecast.

## What it shows

The current temperature, condition, feels-like, wind, humidity, pressure and rain or snow, with a strip of the days ahead,
from MET/Yr or OpenWeatherMap. Six views: Full, Now, Minimal, Glance (a big icon, the temperature and the place), Week
(today and the next days) and Forecast, the multi-day forecast with highs, lows and range bars: horizontal when wide, a
vertical list when tall. Forecast was a widget of its own until config v19, which made every Forecast zone this view. It can
tint itself from the condition, draw an animated background and send the conditions to the Dynamic Island.

## Data it needs

The Yr plugin, `plugins.yr-weather-plugin.<location>.*`: `temp`, `feels_like`, `weather_icon`, `weather_desc`, `name`,
`wind_speed`, `wind_deg`, `wind_gust`, `humidity`, `pressure`, `clouds`, `rain`, `snow`, `last_refreshed` and the
`forecast` table (date, condition, high / low, rain, wind). The OpenWeatherMap plugin, `plugins.weather-plugin.weather.*`,
with the same names. The Forecast view reads only the Yr `forecast` table, and draws (empty) once any sensor exists, as the
Forecast widget did.

## Options

- **Preset** (the view) and its toggles: **Stats row**, **Feels-like**, **Forecast strip**.
- **Forecast days**: 1-7; 0 = as many as fit in the Forecast view (5 in the others).
- **Tint from conditions**, and the **Animated background** with its intensity, particles, speed, wind, lightning,
  clouds, strength and preview (not in the Forecast view).
- **Icon set** (app icons or Meteocons) with the Meteocons style and animation.
- **Provider** (Auto, Yr, OpenWeatherMap), **Location** (blank = the first Yr location) and the themed **Temperature** unit.
- **Send to island**: the conditions beside the time.

## Presets

None yet.
