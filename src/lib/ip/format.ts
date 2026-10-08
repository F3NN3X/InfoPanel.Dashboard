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

/** Numeric value for a sensor item (modifier/division/precision applied). */
export function sensorNumber(
  raw: number,
  b: Pick<IPSensorBinding, "multiplicationModifier" | "divisionToggle" | "additionModifier" | "precision">
): number {
  let v = raw * (b.multiplicationModifier ?? 1);
  if (b.divisionToggle) v /= 10;
  v += b.additionModifier ?? 0;
  const p = b.precision ?? 0;
  return Number(v.toFixed(p));
}

/** Display text for a sensor item (value + optional unit). */
export function sensorText(
  raw: number,
  b: IPSensorBinding
): string {
  const v = sensorNumber(raw, b);
  let s = String(v);
  if (b.showUnit && b.unit) s += b.unit;
  return s;
}
