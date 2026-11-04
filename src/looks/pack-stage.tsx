// The pack's page layers and overlay (lazy: the entry loads this chunk only for a pack with a stage). Every layer is
// decoration: click-through, hidden from assistive tech, and `data-pack-deco` so lite mode stops its motion (index.css).
import { safeFill } from "@/widgets/core/t3-tokens";
import type { PackStageSpec } from "./pack";

export default function PackStageLayers({ stage, base = "", className = "", overlayClassName = "" }: { stage: PackStageSpec; base?: string; className?: string; overlayClassName?: string }) {
  const Overlay = stage.overlay;
  return (
    <>
      {stage.layers.slice(0, 3).map((layer, i) => (
        <div
          key={i}
          aria-hidden
          data-pack-deco=""
          data-pack-layer={i}
          className={`pointer-events-none ${className}`}
          style={{ ...(layer.image ? { backgroundImage: `url("${base}${encodeURI(layer.image)}")`, backgroundSize: "cover" } : { background: safeFill(layer.fill) }), opacity: layer.opacity }}
        />
      ))}
      {Overlay && (
        <div aria-hidden data-pack-deco="" data-pack-layer="overlay" className={`pointer-events-none ${overlayClassName}`}>
          <Overlay />
        </div>
      )}
    </>
  );
}
