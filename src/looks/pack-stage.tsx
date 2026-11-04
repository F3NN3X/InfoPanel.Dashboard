// The pack's page layers, overlay and effects (lazy: the entry loads this chunk only for a pack with a stage). Every layer is
// decoration: click-through, hidden from assistive tech, and `data-pack-deco` so lite mode stops its motion (index.css). The
// effects are drawn here, by code the app owns, planned from the screen's settings (effects.ts); burn-in protection (pixel
// shift, idle dim) marks only these layers, never a widget.
import { useEffect, type CSSProperties } from "react";
import { useGeneral } from "@/hooks/use-general";
import { usePerformance } from "@/hooks/use-performance";
import { liteOf } from "@/lib/performance";
import { safeFill } from "@/widgets/core/t3-tokens";
import ConnectorLayer from "./connector-layer";
import { planEffects, showsAt, sizeClassOf, type PlannedEffect } from "./effects";
import type { StageViewProps } from "./pack";
import { useIdle } from "./use-idle";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** The paint of an overlay effect (glow and blur act on the layers instead). */
function overlayStyle(e: PlannedEffect): CSSProperties | undefined {
  if (e.kind === "scanlines") return { backgroundImage: "repeating-linear-gradient(0deg, #000 0 1px, transparent 1px 3px)" };
  if (e.kind === "vignette") return { backgroundImage: "radial-gradient(ellipse at center, transparent 55%, #000 130%)" };
  if (e.kind === "grain") return { backgroundImage: GRAIN, backgroundSize: "160px" };
  return undefined;
}

export default function PackStageLayers({ stage, packId, base = "", className = "", overlayClassName = "", burnIn, page, connectors, links }: StageViewProps) {
  const general = useGeneral();
  const perf = usePerformance();
  const lite = liteOf(perf);
  const sizeClass = page ? sizeClassOf(page.width, page.height) : undefined;
  const layers = stage.layers.slice(0, 3).filter((l) => showsAt(l.minSizeClass, sizeClass));
  const solidPage = !layers.some((l) => l.image || /gradient\(/i.test(l.fill ?? ""));
  const effects = planEffects(stage.effects, { lite, reduceMotion: perf.reduceMotion, limitBlur: general.blurLimit, solidPage, sizeClass });
  const idle = useIdle(burnIn === "needs-dim" ? general.idleDim : 0);
  // Lite mode switches a widget's blur off while a pack is worn: Classic and the other Looks keep theirs (index.css `data-pack-lite`).
  useEffect(() => {
    document.documentElement.toggleAttribute("data-pack-lite", lite);
    return () => document.documentElement.removeAttribute("data-pack-lite");
  }, [lite]);

  const Overlay = showsAt(stage.overlayMinSizeClass, sizeClass) ? stage.overlay : undefined;
  const deco = burnIn === "needs-shift" && general.pixelShift ? "shift" : burnIn === "needs-dim" && general.idleDim > 0 ? "dim" : "";
  // Glow and blur are one filter on each layer (index.css `wp-pack-fx`), their radii already capped by the plan.
  const glow = effects.find((e) => e.kind === "glow")?.px ?? 0;
  const blur = effects.find((e) => e.kind === "blur")?.px ?? 0;
  const fx = glow > 0 || blur > 0;
  return (
    <>
      {layers.map((layer, i) => (
        <div
          key={i}
          aria-hidden
          data-look={packId}
          data-pack-deco={deco}
          data-pack-layer={i}
          data-idle={deco === "dim" && idle ? "" : undefined}
          className={`pointer-events-none ${fx ? "wp-pack-fx " : ""}${className}`}
          style={{
            ...(fx ? ({ "--wp-fx-glow": `${glow}px`, "--wp-fx-blur": `${blur}px` } as CSSProperties) : null),
            ...(layer.image ? { backgroundImage: `url("${base}${encodeURI(layer.image)}")`, backgroundSize: "cover" } : { background: safeFill(layer.fill) }),
            opacity: layer.opacity,
          }}
        />
      ))}
      {Overlay && (
        <div aria-hidden data-look={packId} data-pack-deco={deco} data-pack-layer="overlay" data-idle={deco === "dim" && idle ? "" : undefined} className={`pointer-events-none ${overlayClassName}`}>
          <Overlay />
        </div>
      )}
      {connectors && links && links.length > 0 && showsAt(stage.overlayMinSizeClass, sizeClass) && <ConnectorLayer links={links} connectors={connectors} className={className} />}
      {effects.map((e, i) =>
        overlayStyle(e) ? <div key={`fx${i}`} aria-hidden data-look={packId} data-pack-deco="" data-pack-effect={e.kind} data-pack-animate={e.animate ? "" : undefined} className={`pointer-events-none ${overlayClassName}`} style={{ ...overlayStyle(e), opacity: e.opacity }} /> : null
      )}
    </>
  );
}
