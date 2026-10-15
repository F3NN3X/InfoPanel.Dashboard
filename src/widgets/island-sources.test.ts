import { describe, expect, it } from "vitest";
import type { IslandUpdate } from "@/lib/island/sources";
import type { WlState } from "@/lib/wavelink";
import type { ModuleSettings } from "@/modules/types";
import type { Data } from "./core/types";
import { FRIEND_COOLDOWN_MS, nowPlayingIsland, steamFriendsIsland, waveLinkIsland } from "./island-sources";

const derive = <T,>(def: { derive(prev: T | null, next: T, settings: ModuleSettings): IslandUpdate }, prev: T | null, next: T) =>
  def.derive(prev, next, {});

const MEDIA = "plugins.media-plugin.media.";
const media = (track: string, artist = "Artist", state = "4", progress = "25"): Data => ({
  [`${MEDIA}current-track`]: track,
  [`${MEDIA}artist`]: artist,
  [`${MEDIA}playback-state`]: state,
  [`${MEDIA}track-progress`]: progress,
  // Spotify idle: Auto takes Windows Media.
  "plugins.spotify-plugin.spotify.current-track": "Idle",
});

describe("Now Playing on the island", () => {
  it("shows the playing track as the activity and raises nothing on the baseline", () => {
    const u = derive(nowPlayingIsland, null, media("Song"));
    expect(u.notices).toEqual([]);
    expect(u.activity).toMatchObject({ title: "Song", subtitle: "Artist", progress: 0.25 });
  });

  it("raises a notice when the track changes, not on a repeat", () => {
    expect(derive(nowPlayingIsland, media("Song"), media("Song")).notices).toEqual([]);
    expect(derive(nowPlayingIsland, media("Song"), media("Next", "Band")).notices).toEqual([
      { id: "track", severity: "info", title: "Next", body: "Band", ttl: 4000 },
    ]);
  });

  it("has no activity and raises nothing while paused", () => {
    const u = derive(nowPlayingIsland, media("Song"), media("Next", "Band", "5"));
    expect(u.activity).toBeNull();
    expect(u.notices).toEqual([]);
  });
});

const SOCIAL = "plugins.InfoPanel.SteamAPI.SteamAPI-Social.friends-activity";
const friends = (...rows: string[]): Data => ({ [SOCIAL]: rows.join("\n") });

describe("Steam Friends on the island", () => {
  it("raises nothing on the baseline or without a change", () => {
    expect(derive(steamFriendsIsland, null, friends("Ann, Online, , now")).notices).toBeUndefined();
    expect(derive(steamFriendsIsland, friends("Ann, Online, , now"), friends("Ann, Online, , now")).notices).toEqual([]);
  });

  it("raises a friend coming online and a friend starting a game, with a cooldown", () => {
    const u = derive(
      steamFriendsIsland,
      friends("Ann, Offline, , 1 h ago", "Bo, Online, , now", "Cy, Online, Portal, now"),
      friends("Ann, Online, , now", "Bo, Online, Dota 2, now", "Cy, Online, Portal, now")
    );
    expect(u.notices).toEqual([
      { id: "friend:Ann", group: "friends", severity: "info", title: "Ann is online", ttl: 4000, cooldownMs: FRIEND_COOLDOWN_MS },
      { id: "friend:Bo", group: "friends", severity: "info", title: "Bo is playing", body: "Dota 2", ttl: 4000, cooldownMs: FRIEND_COOLDOWN_MS },
    ]);
  });

  it("ignores a friend going offline or a new friend in the list", () => {
    const u = derive(steamFriendsIsland, friends("Ann, Online, , now"), friends("Ann, Offline, , now", "New, Online, Doom, now"));
    expect(u.notices).toEqual([]);
  });
});

const wl = (micMuted: boolean, status: WlState["status"] = "up"): WlState => ({
  status,
  appVersion: "2",
  devices: [{ id: "d", name: "Wave:3", deviceType: "in", inputs: [{ id: "i", name: "Microphone", isMuted: micMuted, gain: null }] }],
  channels: [{ id: "c", name: "Music", type: "sw", level: 1, isMuted: false, mixes: [], apps: [] }],
  mixes: [{ id: "m", name: "Stream Mix", level: 1, isMuted: false }],
});

describe("Wave Link on the island", () => {
  it("raises a mute switch with the switch's name", () => {
    expect(derive(waveLinkIsland, wl(false), wl(true)).notices).toEqual([{ id: "mute:input:i", severity: "warning", title: "Microphone muted", ttl: 2500 }]);
    expect(derive(waveLinkIsland, wl(true), wl(false)).notices).toEqual([{ id: "mute:input:i", severity: "info", title: "Microphone live", ttl: 2500 }]);
  });

  it("raises nothing on the baseline, while Wave Link is absent, or without a change", () => {
    expect(derive(waveLinkIsland, null, wl(true)).notices).toBeUndefined();
    expect(derive(waveLinkIsland, wl(false, "absent"), wl(true)).notices).toBeUndefined();
    expect(derive(waveLinkIsland, wl(true), wl(true)).notices).toEqual([]);
  });
});

describe("Wave Link fader moves on the island", () => {
  const fader = (level: number): WlState => ({ ...wl(false), channels: [{ id: "c", name: "Music", type: "sw", level, levelDb: -12, isMuted: false, mixes: [], apps: [] }] });

  it("shows a refreshing level bar for a moving fader, only when switched on", () => {
    expect(waveLinkIsland.derive(fader(0.5), fader(0.6), {}).notices).toEqual([]);
    expect(waveLinkIsland.derive(fader(0.5), fader(0.6), { islandFaders: true }).notices).toEqual([
      { id: "level:channel:c", severity: "info", title: "Music", body: "−12.0 dB", progress: 0.6, ttl: 1500, refresh: true },
    ]);
  });
});

