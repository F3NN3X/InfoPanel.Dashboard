"use client";

import { useCallback, useEffect, useState } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export type AudioDevicesStatus =
  | "unsupported"
  | "loading"
  | "ready"
  | "denied";

/**
 * Enumerates the browser's audio *capture* devices (the ones `getUserMedia`
 * can read — e.g. the Elgato Virtual Audio / Wave Mic side that music is
 * routed to). Device ids are always available; labels only appear after the
 * microphone permission is granted, so `request` unlocks the labels.
 */
export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [status, setStatus] = useState<AudioDevicesStatus>("loading");

  const refresh = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const inputs = list
        .filter((d) => d.kind === "audioinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Capture device ${i + 1}`,
        }));
      setDevices(inputs);
      setStatus("ready");
    } catch {
      setStatus("denied");
    }
  }, []);

  const request = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("unsupported");
      return;
    }
    try {
      // Grab (and immediately release) a generic stream to unlock labels.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await refresh();
    } catch {
      setStatus("denied");
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { devices, status, request };
}
