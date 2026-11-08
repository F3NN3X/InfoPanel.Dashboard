# Bluetooth

Paired devices and their battery levels.

## What it shows

Whether Bluetooth is on and connected, and the paired devices with a battery bar each. Three views set the toggles at once:
status and devices, devices with battery, status only. Small zones get a summary card and a dense view of their own.

## Data it needs

The BTData plugin, `plugins.bluetooth-battery-plugin.*`: a `bt_status` entry, and one entry per device with its name,
status and battery level.

## Options

- **Preset**: Status + devices, Devices + battery or Status only (changing a toggle afterwards reads Custom).
- **Bluetooth status**, **Paired devices** and **Battery levels**.
- **Battery medium** and **Battery low**: the colours (the theme's Warning and Critical unless set).

## Presets

None yet.
