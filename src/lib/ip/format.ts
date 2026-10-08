import type { IPSensorBinding } from "./types";

/**
 * .NET-style date formatting for Clock/Calendar items
 * (tokens: hh h mm ss tt dd MM yyyy MMM ddd …).
 */
export function formatDotNetDate(fmt: string, d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  let out = "";
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    switch (c) {
      case "H":
        out += pad(h, fmt[i + 1] === "H" ? 2 : 1);
        if (fmt[i + 1] === "H") i++;
        break;
      case "h":
        out += pad(h12, (fmt[i + 1] === "h" ? 2 : 1));
        if (fmt[i + 1] === "h") i++;
        break;
      case "m":
        out += pad(d.getMinutes(), 2);
        if (fmt[i + 1] === "m") i++;
        break;
      case "s":
        out += pad(d.getSeconds(), 2);
        if (fmt[i + 1] === "s") i++;
        break;
      case "t":
        out += ampm[0];
        if (fmt[i + 1] === "t") i++;
        break;
      case "d":
        out += pad(d.getDate(), fmt[i + 1] === "d" ? 2 : 1);
        if (fmt[i + 1] === "d") i++;
        break;
      case "M":
        out += pad(d.getMonth() + 1, fmt[i + 1] === "M" ? 2 : 1);
        if (fmt[i + 1] === "M") i++;
        break;
      case "y":
        out += String(d.getFullYear());
        while (fmt[i + 1] === "y") i++;
        break;
      case "g":
        out += "AM/PM"[0];
        break;
      default:
        // MMM / ddd word forms
        if (c === "M" && fmt[i + 1] === "M" && fmt[i + 2] === "M") {
          out += months[d.getMonth()].slice(0, 3);
          i += 2;
          break;
        }
        if (c === "d" && fmt[i + 1] === "d" && fmt[i + 2] === "d") {
          out += days[d.getDay()].slice(0, 3);
          i += 2;
          break;
        }
        out += c;
    }
  }
  return out;
}

/**
 * Modifier-applied numeric value (C# `EvaluateColor` path): DivisionToggle
 * divides by MultiplicationModifier (not a fixed 10); AbsoluteAddition takes
 * the absolute value. Used for threshold checks.
 */
export function sensorNumber(
  raw: number,
  b: Pick<
    IPSensorBinding,
    "multiplicationModifier" | "divisionToggle" | "additionModifier" | "absoluteAddition"
  >
): number {
  const mult = b.multiplicationModifier ?? 1;
  const add = b.additionModifier ?? 0;
  let v = b.divisionToggle ? (mult !== 0 ? raw / mult : raw) + add : raw * mult + add;
  if (b.absoluteAddition) v = Math.abs(v);
  return v;
}

/**
 * Display text for a sensor item — 1:1 port of C#
 * `SensorDisplayItem.EvaluateText(SensorReading)`: unit-driven precision
 * (gb→1, kb/s|mb/s|mbar→2, v→3, default→integer), optional thousands
 * separator, unit suffix. The sensor name is prepended by the caller.
 */
export function sensorText(
  raw: number,
  b: IPSensorBinding,
  liveUnit?: string
): string {
  const v = sensorNumber(raw, b);
  let s: string;
  if (b.overridePrecision) {
    switch (b.precision) {
      case 1:
        s = v.toFixed(1);
        break;
      case 2:
        s = v.toFixed(2);
        break;
      case 3:
        s = v.toFixed(3);
        break;
      default:
        s = String(Math.floor(v));
    }
  } else {
    switch ((liveUnit ?? "").toLowerCase()) {
      case "gb":
        s = v.toFixed(1);
        break;
      case "kb/s":
      case "mb/s":
      case "mbar/min":
      case "mbar":
        s = v.toFixed(2);
        break;
      case "v":
        s = v.toFixed(3);
        break;
      default:
        s = String(Math.round(v));
    }
  }

  if (b.showThousandsSeparator) {
    const dot = s.indexOf(".");
    const digits = dot >= 0 ? s.length - dot - 1 : 0;
    s = Number(s).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  if (b.showUnit) {
    const u = b.overrideUnit ? b.unit : liveUnit;
    if (u) s += u;
  }
  return s;
}
