/** How the profile settings show a number: as .NET writes it (XmlConvert), so a float reads 1.33, not 1.3300000429. Studio-only, off the kiosk's bundle. */

/** XmlConvert.ToString(double): shortest round trip, `E` exponents, INF / NaN. */
export function dotnetDouble(n: number): string {
  if (Number.isNaN(n)) return "NaN";
  if (n === Infinity) return "INF";
  if (n === -Infinity) return "-INF";
  if (Object.is(n, -0)) return "-0";
  return String(n).replace("e", "E");
}

/** XmlConvert.ToString(float): the shortest decimal that reads back to the same float32. */
export function dotnetFloat(n: number): string {
  if (!Number.isFinite(n)) return dotnetDouble(n);
  const f = Math.fround(n);
  for (let p = 1; p <= 9; p++) {
    const s = Number(f.toPrecision(p));
    if (Math.fround(s) === f) return dotnetDouble(s);
  }
  return dotnetDouble(f);
}
