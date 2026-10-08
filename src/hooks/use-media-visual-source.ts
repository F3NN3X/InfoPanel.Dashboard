"use client";

import { useEffect, useRef, useState } from "react";

import { getSharedAudioContext } from "@/lib/audio/audio-context";
import {
  createMediaVisualSource,
  type MediaVisualSourceHandle,
  type MediaVisualSourceOptions,
} from "@/lib/audio/media-visual-source";
import type { FrameSource, VisualFrame } from "@/lib/audio/types";

export interface MediaVisualSource {
  /**
   * Stable `FrameSource<VisualFrame>` for the audiocn live visualizers. Pushes
   * nothing until the device is captured (the visualizers show their idle
   * state); real 60 fps frames once ready.
   */
  readonly source: FrameSource<VisualFrame>;
  /** "loading" while the stream starts, "ready" when live, "error" on failure. */
  status: "idle" | "loading" | "ready" | "error";
  /** The capture device's label (resolved once the stream is live). */
  label: string;
  /** Set when `status` is "error" (device missing, permission denied…). */
  error?: string;
}

/**
 * Captures one audio input device and drives a stable
 * `FrameSource<VisualFrame>` from it (Web Audio, real-time, multi-device).
 * `deviceId` is a stable `enumerateDevices()` id; `null`/`undefined` = idle.
 * The media stream, source node and analyser are torn down on unmount /
 * device change.
 */
export function useMediaVisualSource(
  deviceId: string | null | undefined,
  options?: MediaVisualSourceOptions
): MediaVisualSource {
  const handleRef = useRef<MediaVisualSourceHandle | null>(null);
  if (handleRef.current === null) {
    handleRef.current = createMediaVisualSource(options);
  }
  const handle = handleRef.current;

  const [status, setStatus] = useState<MediaVisualSource["status"]>(
    deviceId ? "loading" : "idle"
  );
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!deviceId) {
      handle.detach();
      setStatus("idle");
      setLabel("");
      setError(undefined);
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    setStatus("loading");
    setError(undefined);

    (async () => {
      const ctx = getSharedAudioContext();
      if (!ctx) {
        if (!cancelled) {
          setStatus("error");
          setError("Web Audio is not supported here");
        }
        return;
      }
      try {
        if (ctx.state === "suspended") {
          // Autoplay policy: a kiosk (permission granted) resumes freely; a
          // studio tab may need a user gesture. Surface it if it fails.
          await ctx.resume();
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "capture failed");
        }
        return;
      }

      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      try {
        sourceNode = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.55;
        // Document the dB window the band reduction uses (the byte output
        // scales to it; the float dB output is raw, mapped in the source).
        analyser.minDecibels = -100;
        analyser.maxDecibels = -30;
        sourceNode.connect(analyser);
        handle.attach(analyser);
        setStatus("ready");

        // Resolve the friendly label now that permission is granted.
        navigator.mediaDevices
          .enumerateDevices()
          .then((list) => {
            if (cancelled) return;
            const match = list.find((d) => d.deviceId === deviceId);
            setLabel(match?.label || deviceId);
          })
          .catch(() => {
            if (!cancelled) setLabel(deviceId);
          });
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "capture failed");
        }
      }
    })();

    return () => {
      cancelled = true;
      handle.detach();
      try {
        sourceNode?.disconnect();
      } catch {
        /* node already gone */
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [deviceId, handle]);

  // The stable source outlives device changes; drop it on unmount.
  useEffect(() => {
    return () => {
      handle.dispose();
    };
  }, [handle]);

  return { source: handle.source, status, label, error };
}
