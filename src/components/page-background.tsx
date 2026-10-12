import { useEffect, useRef } from "react";
import { useDocumentHidden } from "@/hooks/use-document-hidden";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  backgroundLayers,
  posterBackground,
  videoPolicy,
  videoStyle,
  type PageBackground as Background,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

interface PageBackgroundProps {
  background: Background;
  /** Placement of the layer (kiosk: fixed to the viewport; studio: the grid). */
  className?: string;
}

/**
 * The page background: the fill, the media layer (gradient / image /
 * video, blurred with an edge bleed the container clips) and the dim +
 * tint overlay. Never takes pointer events. A video pauses while the page
 * is hidden and shows only its poster on reduced motion.
 */
export function PageBackground({ background, className }: PageBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const hidden = useDocumentHidden();
  const policy =
    background.type === "video" ? videoPolicy({ motion: reducedMotion ? "reduce" : "full", hidden }) : null;
  const shown = policy === "poster" ? posterBackground(background) : background;
  const { fill, media, overlay } = backgroundLayers(shown);
  return (
    <div
      aria-hidden
      data-page-background={background.type}
      className={cn("pointer-events-none overflow-hidden", className)}
      style={fill}
    >
      {media && <div className="absolute inset-0" style={media} />}
      {shown.type === "video" && shown.src && <BackgroundVideo background={shown} playing={policy === "play"} />}
      {overlay && <div className="absolute inset-0" style={overlay} />}
    </div>
  );
}

/**
 * The video layer. It starts muted (autoplay allows that); with sound
 * asked for it tries to play unmuted and falls back to muted when the
 * browser refuses.
 */
function BackgroundVideo({ background, playing }: { background: Background; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const rate = background.rate ?? 1;
  const sound = background.muted === false;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.defaultPlaybackRate = rate;
    video.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!playing) {
      video.pause();
      return;
    }
    video.muted = !sound;
    video.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === "NotAllowedError") || video.muted) return;
      video.muted = true;
      void video.play().catch(() => undefined);
    });
  }, [playing, sound, background.src]);

  return (
    <video
      ref={ref}
      src={background.src}
      poster={background.poster}
      autoPlay={playing}
      muted
      loop={background.loop ?? true}
      playsInline
      preload="auto"
      onLoadedMetadata={(e) => {
        e.currentTarget.playbackRate = rate;
      }}
      className="absolute"
      style={videoStyle(background)}
    />
  );
}
