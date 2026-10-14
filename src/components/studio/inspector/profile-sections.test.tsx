import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProfileView } from "@/lib/layout";
import { ProfileFields } from "./profile-sections";

const profile = { id: "p", name: "Main", width: 1920, height: 1080, cols: 12, rows: 6, fit: "fill", placements: [] } as unknown as ProfileView;
const fields = (p: ProfileView) =>
  renderToString(h(ProfileFields, { profile: p, updateProfile: () => {}, canRemove: true, onRemove: () => {}, dashboardRadius: 0.55 }));

describe("ProfileFields corner radius", () => {
  it("shows the dashboard radius until the profile sets its own", () => {
    expect(fields(profile)).toMatch(/aria-label="Corner radius"[^>]*value="0.55"|value="0.55"[^>]*aria-label="Corner radius"/);
    expect(fields({ ...profile, radius: 1 } as ProfileView)).toMatch(/aria-label="Corner radius"[^>]*value="1"|value="1"[^>]*aria-label="Corner radius"/);
  });
});

describe("ProfileFields spacing", () => {
  it("adds a slider to Gap and Padding that rests on the default while unset", () => {
    const html = fields(profile);
    expect(html).toMatch(/type="range"[^>]*aria-label="Gap"/);
    expect(html).toMatch(/type="range"[^>]*aria-label="Padding"/);
    expect(fields({ ...profile, gap: 20 } as ProfileView)).toMatch(/type="range"[^>]*aria-label="Gap"[^>]*value="20"|value="20"[^>]*aria-label="Gap"/);
  });
});
