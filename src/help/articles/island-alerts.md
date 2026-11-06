---
id: island-alerts
title: Dynamic Island and alerts
icon: notifications
related: [widget-settings, studio]
verified: 1.3.0-beta.36
---

A small pill at the top of the kiosk that shows the time, and expands to show alerts and notices.

## Dynamic Island

Open **Alerts & Island** in the sidebar, choose the **Island** tab and turn on **Show the island on this screen**. Pick the screen the island is for at the top. The tab has these sections:

| Section | Holds |
|---|---|
| Shape | Style (Pill or Notch), Size (S, M or L), Scale, Offset from edge, Reserve space |
| When nothing is happening | **Show**: Time, Time and date, Time and values, Line or Hidden; Rotate every |
| Theme | The island themes (Frosted pill, Light pill, Match theme and more: one press sets the shape, color, opacity, border, shadow and weight for this screen), then Placement (Overlay, or Part of the widget style, which wears the screen's widget surface, edge and accent), Color (Match widgets, Black, Match theme or Custom), Opacity (both for overlays), Border, Shadow, Weight; the font is a link to **Theme › Text** |
| Clock | A link to **Settings › Dashboard › Clock & date** |
| Motion | Animation: Lively, Smooth or Off |
| Dashboard notices | Page name, Layout updated, Plugin back, On air (OBS), Calendar countdown, Coding agents |
| Alerts | Collapse alerts after, Group notices |

The preview beside them switches between **Idle**, **Alert** and **Notice**. **Alerts that show here** lists the rules that reach this island. **Widgets sent to the island** lists the widgets that raise their own alerts, each with **Open widget ↗**. Turn it on per widget under **Behavior › Send to island**.

## Alerts

Open **Alerts & Island** in the sidebar. **Alerts on** turns the rules on or off. The tabs are **Alerts**, **Island** and **History**. **Alerts** shows **Active now** (what is firing, with acknowledge and dismiss), each rule with its condition and style, an on/off toggle, **Duplicate** and **Delete**, and when it **Last fired**, and **Start from a preset**; **New rule** adds a **Blank sensor rule**, a **Blank notification rule** or a rule from **Presets**. The open rule shows the sensor over the last five minutes, which fills in while the rule is open, and **How it shows**: **Auto** picks by severity and by screen (the island where there is one, a toast elsewhere, and a widget highlight when critical). **Send a test to displays** replaces what the rule is showing and is marked as a test on the screen and in History. A test that stays until acknowledged ends after 30 seconds. A screen shows one alert at a time and the others wait in the island, or behind the card with a count where there is no island; acknowledging the one showing moves on to the next, and each gets its full time. **Mute for 1 h** sits in the header on every tab; **Alerts on** sits beside it on **Alerts**, and **Defaults** opens the default style, position, size, **Show for**, **Dim the page behind** and quiet hours. **History** lists the last 200 alerts with their value, how they showed and how they ended, by severity, with or without tests, and **Export CSV** saves them.
