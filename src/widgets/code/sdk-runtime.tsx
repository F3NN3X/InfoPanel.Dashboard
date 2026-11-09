// The SDK object a code widget's bundle is called with (src/widgets/sdk.ts `WidgetSdk`): the app's own React and primitives, so a
// bundle carries no React of its own and draws in the theme and pack like a built-in. `satisfies` keeps it in step with the types
// the published .d.ts declares.
import { createElement, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Empty, fmt, Icon, Num, Ring } from "../kit";
import { defineWidget, type SdkReading, type WidgetSdk } from "../sdk";

/** A reading as text: its own text, else its number (up to `decimals`) and unit, else a dash. */
export const formatReading = (r: SdkReading | undefined, decimals = 0): string => {
  if (!r) return "—";
  if (r.text) return r.text;
  if (typeof r.value !== "number" || !Number.isFinite(r.value)) return "—";
  return r.unit ? `${fmt(r.value, decimals)} ${r.unit}` : fmt(r.value, decimals);
};

export const SDK = {
  version: 1,
  defineWidget,
  React: { createElement, Fragment, useState, useEffect, useMemo, useRef } as unknown as WidgetSdk["React"],
  Ring: (p) => <Ring value={p.value ?? 0} max={p.max} t={p.t}>{p.children}</Ring>,
  Num: (p) => <Num className={p.className} style={p.style}>{p.children}</Num>,
  Bar: (p) => <Bar value={p.value ?? 0} max={p.max} t={p.t} />,
  Icon: (p) => <Icon name={p.name} className={p.className} />,
  Empty: (p) => <Empty icon={p.icon} label={p.label} hint={p.hint} />,
  format: formatReading,
} satisfies WidgetSdk;
