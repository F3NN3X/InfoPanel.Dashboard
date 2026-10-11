# InfoPanel Dashboard

A modern web dashboard (React, Tailwind, shadcn/ui) for live InfoPanel data, with a studio for designing layouts. It runs on its own: a small Node server serves the page, and the sensor data comes from the [InfoPanel.DataBridge](https://github.com/F3NN3X/InfoPanel.DataBridge) plugin.

```
InfoPanel app ──push──▶ DataBridge plugin (127.0.0.1:3921)  ◀──sensors / SSE──┐
                                                                               │
                        Dashboard server (127.0.0.1:3922) ──page, config──▶ browser / InfoPanel web page profile
```

## Requirements

- Node.js 20 or newer
- InfoPanel with the DataBridge plugin installed and running (it provides `http://127.0.0.1:3921/api/sensors` and `/events`)

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

The studio config is stored by the server in `%LOCALAPPDATA%\InfoPanel\Dashboard\config.json`. On first start the server imports the config the DataBridge plugin used to keep (`%LOCALAPPDATA%\InfoPanel\DataBridge\dashboard-config.json`), if there is one.

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
