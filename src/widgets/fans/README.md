# Fans

Fan speeds and duty.

## What it shows

The graphics card's fans 1–3 with their duty %, plus the CPU fan, each as a bar against a full-scale speed. The fan icons
spin at a speed proportional to the RPM. Small zones get a summary card and a dense view of their own.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases): the graphics card's `libre.<gpu>_gpu_fan_1`–`gpu_fan_3` (RPM) and
`gpu_fan_<n>_control` (%), and the CPU fan from the hardware readings by name
(`libre.embedded_controller_cpu_optional_fan` on boards that report it).

## Options

- **Spin the fan icons** (Behaviour).
- **Full-scale speed (RPM)** (Data).

## Presets

None yet.
