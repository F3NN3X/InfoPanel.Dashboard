# InfoPanel Dashboard

A modern web dashboard (React, Tailwind, shadcn/ui) for live InfoPanel data, with a studio for designing layouts. It runs on its own: a small Node server serves the page, and the sensor data comes from InfoPanel's native Data API.

```
InfoPanel Data API (127.0.0.1:3921)  ◀──sensors / SSE──┐
                                                        │
Dashboard server (127.0.0.1:3922) ──page, config──▶ browser / InfoPanel web page profile
```

## Requirements

- Node.js 20 or newer
- InfoPanel with its Data API enabled (it provides `/api/sensors` and `/events`, by default on `http://127.0.0.1:3921`)
- Optional: the `wavelink-plugin` for the Wave Link widget and the `yr-weather-plugin` for the weather forecast

## Run it

```bash
npm install
npm run serve      # build, then start the server
```

Open http://127.0.0.1:3922. After the first build, `npm start` starts the server without rebuilding.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 with hot reload. Config and image-proxy requests are forwarded to the running dashboard server, so start that too. |
| `npm run build` | Type-checks and builds `dist/`. |
| `npm start` | Serves `dist/` on port 3922. |
| `npm run serve` | Both of the above. |

The server listens on `127.0.0.1:3922`; set `PORT` or `HOST` to change it.

## Show it in InfoPanel

Create a desktop profile in InfoPanel, turn on **Web Page** mode, and set the URL to:

```
http://127.0.0.1:3922/?kiosk=1&profile=<profile id>
```

`?kiosk=1` shows the dashboard without the header or studio button. `?profile=` picks one of the studio's profiles; without it, the profile is chosen by window size.

## The studio

Click the wrench button (or open `/?studio=1`) to edit layouts. Changes save automatically, and the **Save** button saves immediately. Every open kiosk page, including InfoPanel's web page profiles, picks up a saved change within about a second without reloading.

The studio config is stored by the server in `%LOCALAPPDATA%\InfoPanel\Dashboard\config.json`.

### Data API URL

The studio's side panel (with nothing selected) has a **Data API URL** setting, default `http://127.0.0.1:3921`. It is saved in the config, so kiosk pages follow it too, and changing it reconnects the live streams without a restart. **Test connection** checks that `{url}/api` answers, and **Open API index** opens the Data API's page listing every key.

### How the dashboard reads the Data API

- **Sensor values** come from filtered change streams, `{url}/events?prefix=<namespace>&interval=1000`: the full set under the prefix on connect, then only changed and removed keys. A page opens one stream per namespace its visible widgets read (`plugins.<plugin>.`, `libre.`, `system.`, …), folding the plugin streams into one `plugins.` stream past four, since browsers allow six connections per host. Each zone re-renders only when one of its own keys changes. Streams reconnect on their own, and a changed Data API URL drops the old values and reconnects.
- **Wave Link** has its own 100 ms stream, `{url}/events?prefix=plugins.wavelink-plugin.wavelink.&interval=100`, feeding the meters without React re-renders.
- **The studio's pickers** (sensor binding, Sources view, a widget's source select) use `{url}/api/sources` for plugin, container and entry names and entry types, and one `{url}/api/sensors` snapshot for values, re-fetched when a picker opens.
- **Plugin images** (`/api/images/{pluginId}/{imageId}`) render as images; root-relative paths resolve against the Data API URL.

The weather forecast comes from the yr plugin (`plugins.yr-weather-plugin.<location>.forecast`). Saved layouts bound to the retired DataBridge forecast key are migrated automatically.

## Server endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | The dashboard (any unknown path also returns it) |
| GET / POST | `/api/config` | Read or save the studio config |
| GET | `/events/config` | Server-sent events: the config version on connect and after each save |
| GET | `/api/image-proxy?url=` | Fetches an image so the page can sample its colours (https anywhere, http only on loopback) |

## Docs

- [Widget catalog](docs/module-catalog.md)
- [Widget settings](docs/widget-settings.md)
- [Studio design: zones and widgets](docs/studio-redesign-zones-widgets.md)
- `tools/ip-import.cjs` imports an InfoPanel profile as a dashboard layout.
