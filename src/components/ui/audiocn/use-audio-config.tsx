// Vendored from audiocn (https://www.audiocn.dev), `use-audio-config`. MIT licence, Copyright (c) 2026 OrcDev: see LICENSE here.
// Kept close to upstream so later diffs stay readable: imports point here, the `"use client"` line is gone (no server
// components in this app), and any other local change carries a `local:` comment.
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import type { BallisticsInput } from "@/lib/audio/ballistics";
import type { MeterZone, Orientation } from "@/lib/audio/types";

export type AudioSize = "sm" | "default" | "lg";

/**
 * Settings a container (a mixer or channel strip) passes down to the audiocn
 * components inside it. Explicit props on a component always win.
 */
export interface AudioConfig {
  orientation?: Orientation;
  size?: AudioSize;
  disabled?: boolean;
  /** Muted or silenced by another channel's solo: meters render dimmed. */
  dimmed?: boolean;
  minDb?: number;
  maxDb?: number;
  zones?: MeterZone[];
  ballistics?: BallisticsInput;
}

const AudioConfigContext = createContext<AudioConfig>({});

export interface AudioConfigProviderProps {
  value: AudioConfig;
  children: ReactNode;
}

/** Merges `value` over any config from a parent provider. */
export const AudioConfigProvider = ({
  value,
  children,
}: AudioConfigProviderProps) => {
  const parent = useContext(AudioConfigContext);
  const {
    ballistics,
    dimmed,
    disabled,
    maxDb,
    minDb,
    orientation,
    size,
    zones,
  } = value;

  const merged = useMemo<AudioConfig>(
    () => ({
      ballistics: ballistics ?? parent.ballistics,
      dimmed: (dimmed ?? false) || (parent.dimmed ?? false),
      disabled: (disabled ?? false) || (parent.disabled ?? false),
      maxDb: maxDb ?? parent.maxDb,
      minDb: minDb ?? parent.minDb,
      orientation: orientation ?? parent.orientation,
      size: size ?? parent.size,
      zones: zones ?? parent.zones,
    }),
    [
      ballistics,
      dimmed,
      disabled,
      maxDb,
      minDb,
      orientation,
      parent,
      size,
      zones,
    ]
  );

  return (
    <AudioConfigContext.Provider value={merged}>
      {children}
    </AudioConfigContext.Provider>
  );
};

/** The config from the nearest mixer or channel strip, or `{}`. */
export const useAudioConfig = (): AudioConfig => useContext(AudioConfigContext);
