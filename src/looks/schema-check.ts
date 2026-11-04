// A small JSON Schema checker for the keywords look.schema.json and pack.schema.json use (type, const, enum, pattern, minLength,
// minimum, maximum, minItems, items, required, minProperties, properties, additionalProperties, $ref into $defs, if/then/else, not),
// so the repo needs no JSON Schema dependency. One line per error, each starting with the path (`$.t1.dark`).

type Schema = Record<string, unknown>;

/** The errors of `value` against `s`; `root` holds the `$defs` a `$ref` points into. */
export function schemaErrors(value: unknown, s: Schema, root: Schema, at = "$"): string[] {
  if (typeof s.$ref === "string") return schemaErrors(value, (root.$defs as Record<string, Schema>)[s.$ref.replace("#/$defs/", "")], root, at);
  const out: string[] = [];
  const types = s.type === undefined ? [] : ([] as unknown[]).concat(s.type);
  const typeOf = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
  if (types.length && !types.includes(typeOf(value))) return [`${at}: ${typeOf(value)} is not ${types.join("/")}`];
  if ("const" in s && value !== s.const) out.push(`${at}: not ${JSON.stringify(s.const)}`);
  if (Array.isArray(s.enum) && !s.enum.includes(value)) out.push(`${at}: ${JSON.stringify(value)} not in ${s.enum.join(", ")}`);
  if (typeof s.pattern === "string" && typeof value === "string" && !new RegExp(s.pattern).test(value)) out.push(`${at}: does not match ${s.pattern}`);
  if (typeof s.minLength === "number" && typeof value === "string" && value.length < s.minLength) out.push(`${at}: too short`);
  if (typeof value === "number" && ((typeof s.minimum === "number" && value < s.minimum) || (typeof s.maximum === "number" && value > s.maximum))) out.push(`${at}: out of range`);
  if (Array.isArray(value)) {
    if (typeof s.minItems === "number" && value.length < s.minItems) out.push(`${at}: too few items`);
    if (s.items) value.forEach((v, i) => out.push(...schemaErrors(v, s.items as Schema, root, `${at}[${i}]`)));
  }
  if (typeOf(value) === "object") {
    const obj = value as Record<string, unknown>;
    const props = (s.properties ?? {}) as Record<string, Schema>;
    for (const key of (s.required as string[] | undefined) ?? []) if (!(key in obj)) out.push(`${at}: ${key} is required`);
    if (typeof s.minProperties === "number" && Object.keys(obj).length < s.minProperties) out.push(`${at}: too few properties`);
    for (const [key, v] of Object.entries(obj)) {
      if (props[key]) out.push(...schemaErrors(v, props[key], root, `${at}.${key}`));
      else if (s.additionalProperties === false) out.push(`${at}: ${key} is not allowed`);
      else if (typeof s.additionalProperties === "object") out.push(...schemaErrors(v, s.additionalProperties as Schema, root, `${at}.${key}`));
    }
  }
  if (s.if) out.push(...schemaErrors(value, ((schemaErrors(value, s.if as Schema, root, at).length === 0 ? s.then : s.else) as Schema) ?? {}, root, at));
  if (s.not && schemaErrors(value, s.not as Schema, root, at).length === 0) out.push(`${at}: matches a schema it must not`);
  return out;
}
