# Bottleneck Lens

What holds your frame rate back.

## What it shows

One verdict line (CPU-bound, GPU-bound, VRAM full, thermal or power throttled, or balanced) with the reason in small type
and the last five minutes of verdicts as a strip. A verdict has to hold for a few seconds before it changes. Quiet when no
game runs. Small zones get a summary card.

## Data it needs

The sensor roles, not fixed keys (`role-data.ts`, owning no prefix): `gpu.load`, `cpu.load`, `cpu.maxcore`, `vram.used`,
`vram.total`, `fps` and `gpu.temp`, and the thermal and power throttle flags.

## Options

- **Hold a verdict (s)**.
- **GPU-bound at**, **CPU-bound at** and **VRAM full at** (%).

## Presets

None yet.
