// A code widget placement's component (Phase 6b), the code chunk's: loads the widget (`loader.ts`: only after the server verified
// it), watches it while on screen, and draws its definition's `render` inside the standard card, so the theme and the pack apply
// as for a built-in. A widget that is missing, refused, switched off or not loadable draws the standard "Widget not available"
// card with the reason. A widget that throws while it draws is caught here (`Contained`) and draws that card too: the page, and
// every other zone, go on.
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSensors } from "@/hooks/useSensors";
import type { ModuleSettings } from "@/modules/types";
import { Empty, shell, Widget, type ShellProps } from "../kit";
import type { CodeWidgetDefinition, CodeWidgetProps } from "../sdk";
import { loadCode, watchCode, type CodeState } from "./loader";

export interface CodeWidgetHostProps extends ShellProps {
  look?: ModuleSettings;
  /** The placement's module id, `ext:<publisher>.<name>`. */
  code: string;
  saved?: ModuleSettings;
}

/** Catches what the widget's own component throws while it draws; a new bundle (`reset`) tries again. */
class Contained extends Component<{ reset: string; children: ReactNode; fallback: (message: string) => ReactNode }, { error?: string; reset: string }> {
  state: { error?: string; reset: string } = { reset: this.props.reset };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  static getDerivedStateFromProps(p: { reset: string }, s: { reset: string }) {
    return p.reset === s.reset ? null : { error: undefined, reset: p.reset };
  }
  render() {
    return this.state.error === undefined ? this.props.children : this.props.fallback(this.state.error);
  }
}

/** The values the widget is given: each of its settings, stored or default. */
const valuesOf = (def: CodeWidgetDefinition, saved: ModuleSettings | undefined): CodeWidgetProps["settings"] =>
  Object.fromEntries((def.settings ?? []).map((s) => [s.key, typeof saved?.[s.key] === typeof s.default ? (saved?.[s.key] as string | number | boolean) : s.default]));

function Body({ def, saved }: { def: CodeWidgetDefinition; saved?: ModuleSettings }) {
  const sensors = useSensors(def.reads) as CodeWidgetProps["sensors"];
  const settings = useMemo(() => valuesOf(def, saved), [def, saved]);
  const Render = def.render;
  return <>{Render({ sensors, settings })}</>;
}

export default function CodeWidget(p: CodeWidgetHostProps) {
  const [state, setState] = useState<CodeState>();
  useEffect(() => {
    let live = true;
    void loadCode(p.code).then((s) => live && setState(s));
    const stop = watchCode(p.code, (s) => live && setState(s));
    return () => {
      live = false;
      stop();
    };
  }, [p.code]);
  const def = state && "def" in state ? state.def : undefined;
  const title = p.title ?? def?.name ?? p.code.slice(4);
  const unavailable = (hint?: string) => <Empty icon="widgets" label="Widget not available" hint={hint?.slice(0, 120)} large />;
  if (!def) {
    return (
      <Widget {...shell(p)} title={title} icon="widgets" design={null}>
        {state && unavailable("why" in state ? state.why : undefined)}
      </Widget>
    );
  }
  const sha256 = state && "sha256" in state ? state.sha256 : "";
  return (
    <Widget {...shell(p)} title={title} icon={def.icon ?? "widgets"} design={null}>
      <Contained reset={sha256} fallback={(m) => unavailable(`It stopped with an error: ${m}`)}>
        <Body key={sha256} def={def} saved={p.saved} />
      </Contained>
    </Widget>
  );
}
