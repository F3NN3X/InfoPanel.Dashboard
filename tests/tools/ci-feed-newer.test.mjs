import { describe, expect, it } from "vitest";
import { compareVersions, decideFeed, parseVersion } from "../../tools/ci/feed-newer.mjs";

describe("compareVersions", () => {
  it("orders prerelease numbers numerically, not as text", () => {
    expect(compareVersions("1.3.1-beta.10", "1.3.1-beta.9")).toBe(1);
    expect(compareVersions("1.3.1-beta.9", "1.3.1-beta.10")).toBe(-1);
  });
  it("ranks a release above its prereleases and a higher core above any prerelease of a lower one", () => {
    expect(compareVersions("1.3.1", "1.3.1-beta.99")).toBe(1);
    expect(compareVersions("1.3.2-beta.1", "1.3.1")).toBe(1);
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
  });
  it("treats equal versions, a leading v and build metadata as equal", () => {
    expect(compareVersions("v1.3.1-beta.1", "1.3.1-beta.1+abc")).toBe(0);
  });
  it("ranks a longer prerelease and an alphanumeric id higher", () => {
    expect(compareVersions("1.0.0-beta", "1.0.0-beta.1")).toBe(-1);
    expect(compareVersions("1.0.0-alpha", "1.0.0-1")).toBe(1);
    expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
  });
  it("throws on a version that is not semver", () => {
    expect(() => compareVersions("1.3", "1.3.1")).toThrow(/not a semver/);
    expect(parseVersion("latest")).toBeNull();
  });
});

describe("decideFeed", () => {
  it("skips when the feed is newer", () => {
    expect(decideFeed({ version: "1.3.1-beta.9", feedVersion: "1.3.1-beta.10" }).write).toBe(false);
  });
  it("writes when the feed is older, equal, missing or unusable", () => {
    expect(decideFeed({ version: "1.3.1-beta.10", feedVersion: "1.3.1-beta.9" }).write).toBe(true);
    expect(decideFeed({ version: "1.3.1", feedVersion: "1.3.1" }).write).toBe(true);
    expect(decideFeed({ version: "1.3.1" }).write).toBe(true);
    expect(decideFeed({ version: "1.3.1", feedVersion: "garbage" }).write).toBe(true);
  });
});
