import { obsAct, obsRefusal } from "@/lib/obs-control";
import type { ModuleSettings } from "@/modules/types";
import { Widget, shell, ButtonTile, STATE, type ShellProps } from "../kit";
import { ReadOnly } from "../ReadOnly";
import { useExtras } from "../time-hooks";
import { meta } from "./meta";

export { meta };

export interface ObsButtonProps extends ShellProps {
  look?: ModuleSettings;
  /** `scene` switches to a scene, `mic` flips the mic's mute, `replay` saves the replay buffer. */
  action?: "scene" | "mic" | "replay";
  /** The scene's id (`scene`). */
  scene?: string;
  /** Replaces the name under the symbol. */
  name?: string;
  /** Replaces the symbol (a Material Symbols name). */
  symbol?: string;
}

export default function ObsButton(p: ObsButtonProps) {
  const obs = useExtras().obs;
  const readOnly = obsRefusal.use();
  const action = p.action ?? "scene";
  const scene = action === "scene" ? obs.scenes.find((s) => s.id === p.scene) : undefined;
  const muted = action === "mic" && obs.mic?.muted === true;
  const active = action === "scene" ? !!scene && scene.id === obs.currentScene : muted;
  const ready = obs.connected && (action === "scene" ? !!scene : action === "mic" ? obs.mic !== null : obs.replay !== null);
  const name = p.name || (action === "scene" ? (scene?.name ?? "Scene") : action === "mic" ? (muted ? "Mic off" : "Mic") : "Replay");
  const icon = p.symbol || (action === "scene" ? scene?.icon || "movie" : action === "mic" ? (muted ? "mic_off" : "mic") : "replay");
  const tint = action === "mic" ? STATE.crit : "var(--w-accent)";
  const press = () => {
    if (action === "scene" && scene) void obsAct({ op: "scene", id: scene.id });
    else if (action === "mic") void obsAct({ op: "mic" });
    else if (action === "replay") void obsAct({ op: "replay" });
  };
  return (
    <Widget {...shell(p)} title={p.title ?? name} icon="videocam" showHeader={p.showHeader ?? false} bleed>
      {({ w, h }) => {
        const corner = p.radius === undefined ? "calc(var(--radius, 1rem) * 0.62)" : `${p.radius * 0.62}px`;
        return (
          <ReadOnly on={readOnly}>
          <ButtonTile w={w} h={h} icon={icon} name={name} status={ready && action === "scene" && active ? "On air" : undefined} tint={tint} active={active} outline={action === "scene" && active ? "rgba(255,255,255,.92)" : undefined} disabled={!ready} corner={corner} onPress={press} />
          </ReadOnly>
        );
      }}
    </Widget>
  );
}
