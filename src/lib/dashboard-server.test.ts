import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConfig } from "./dashboard-server";

const respond = (status: number, body?: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }))
  );

afterEach(() => vi.unstubAllGlobals());

describe("fetchConfig", () => {
  it("returns the saved config", async () => {
    respond(200, { profiles: [{ id: "a" }] });
    expect(await fetchConfig()).toEqual({ profiles: [{ id: "a" }] });
  });

  it("returns null when nothing is saved or the file has no profiles", async () => {
    respond(404);
    expect(await fetchConfig()).toBeNull();
    respond(200, { theme: {} });
    expect(await fetchConfig()).toBeNull();
  });

  it("throws when the server answers with an error, so nothing gets pushed over it", async () => {
    respond(502);
    await expect(fetchConfig()).rejects.toThrow("502");
  });
});
