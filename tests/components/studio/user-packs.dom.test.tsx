// @vitest-environment happy-dom
// The user packs section of the Look gallery: an import shows the validator's issues in plain words and stores only a pack with no
// error; removing a pack that a level wears takes it off that level (Classic is drawn there) and says so.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserPacks } from "@/components/studio/user-packs";
import { forgetUserPack } from "@/looks/user-packs";
import { readPackDir } from "../../../tools/validate-pack.mjs";

vi.mock("@/components/studio/look-thumb", () => ({ LookThumb: () => null }));

// biome-ignore lint/suspicious/noExplicitAny: fixtures edit parsed JSON of any shape.
type Json = any;
const enc = (s: string) => new TextEncoder().encode(s);

/** Field Kit's files as a user's own pack `mine`, as `File`s with their folder path. */
function files(edit: (all: Map<string, Uint8Array>, pack: Json, look: Json) => void = () => {}): File[] {
  const src = readPackDir("src/looks/packs/field-kit", /\.tsx?$/);
  const all = new Map<string, Uint8Array>(src.files.filter((f: Json) => f.path !== "pack.css").map((f: Json) => [f.path, f.bytes]));
  const pack = structuredClone(src.pack) as Json;
  const look = structuredClone(src.look) as Json;
  pack.id = look.id = "mine";
  pack.fonts = pack.fonts.map((f: Json) => ({ ...f, family: f.family.replace("pack-", "pack-mine-") }));
  for (const k of Object.keys(look.fonts)) look.fonts[k] = look.fonts[k].replace("pack-", "pack-mine-");
  pack.assets = [...all].filter(([p]) => p.startsWith("assets/")).map(([p, b]) => ({ file: p.slice(7), bytes: b.length }));
  edit(all, pack, look);
  all.set("pack.json", enc(JSON.stringify(pack)));
  all.set("look.json", enc(JSON.stringify(look)));
  return [...all].map(([path, bytes]) => {
    const file = new File([bytes as BlobPart], path.split("/").pop()!);
    Object.defineProperty(file, "webkitRelativePath", { value: `mine/${path}` });
    return file;
  });
}

/** The fake server: a list of packs, a log of the requests. */
function server(list: { id: string; name: string; size: number }[]) {
  const log: string[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    log.push(`${init?.method ?? "GET"} ${url}`);
    if (url === "/api/packs" && (init?.method ?? "GET") === "GET") return new Response(JSON.stringify(list));
    if (url === "/api/packs" && init?.method === "POST") return new Response("", { status: 200 });
    if (init?.method === "DELETE") {
      list.splice(0, list.length);
      return new Response(null, { status: 204 });
    }
    return new Response("", { status: 404 });
  });
  return log;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  forgetUserPack("mine");
});

const pick = async (label: string, list: File[]) => {
  const input = screen.getByLabelText(label) as HTMLInputElement;
  Object.defineProperty(input, "files", { value: list, configurable: true });
  await act(async () => void fireEvent.change(input));
  await act(async () => {});
};

describe("importing a pack", () => {
  it("a hostile pack is refused with the issue in words, and nothing is sent", async () => {
    const log = server([]);
    render(<UserPacks currentLookId="classic" onPick={() => {}} onRemove={() => 0} />);
    await act(async () => {});
    await pick("Pack folder", files((all) => all.set("assets/hazard.svg", enc("<svg><script>alert(1)</script></svg>"))));
    const report = screen.getByRole("alert");
    expect(report.textContent).toContain("can't be imported");
    expect(report.textContent).toContain("assets/hazard.svg");
    expect(log.some((l) => l.startsWith("POST"))).toBe(false);
  });

  it("a pack with its own style sheet is refused, a good one is posted", async () => {
    const log = server([]);
    render(<UserPacks currentLookId="classic" onPick={() => {}} onRemove={() => 0} />);
    await act(async () => {});
    const css = new File(["a{}"], "pack.css");
    Object.defineProperty(css, "webkitRelativePath", { value: "mine/pack.css" });
    await pick("Pack folder", [...files(), css]);
    expect(screen.getByRole("alert").textContent).toContain("cannot bring its own stylesheet");
    expect(log.some((l) => l.startsWith("POST"))).toBe(false);
    await pick("Pack folder", files());
    expect(log.filter((l) => l.startsWith("POST"))).toEqual(["POST /api/packs"]);
  });
});

describe("a pack that was stored but cannot be read back", () => {
  it("is taken off the server again, and the report says so", async () => {
    const log = server([]);
    render(<UserPacks currentLookId="classic" onPick={() => {}} onRemove={() => 0} />);
    await act(async () => {});
    await pick("Pack folder", files());
    expect(log).toContain("DELETE /api/packs/mine");
    expect(screen.getByRole("alert").textContent).toContain("taken off again");
  });
});

describe("removing a pack", () => {
  it("one that a level wears is taken off it, with a notice that Classic is drawn there", async () => {
    const list = [{ id: "mine", name: "Mine", size: 10 }];
    const log = server(list);
    const onRemove = vi.fn(() => 2);
    render(<UserPacks currentLookId="mine" onPick={() => {}} onRemove={onRemove} />);
    await act(async () => {});
    await act(async () => void fireEvent.click(await screen.findByRole("button", { name: "Remove Mine" })));
    await act(async () => {});
    expect(onRemove).toHaveBeenCalledWith("mine");
    expect(log).toContain("DELETE /api/packs/mine");
    expect(screen.getByRole("status").textContent).toBe("Removed Mine. 2 places that wore it now draw Classic.");
  });

  it("a removal the server refuses leaves the config as it was and says so", async () => {
    const log: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      log.push(`${init?.method ?? "GET"} ${url}`);
      if (init?.method === "DELETE") return new Response("user packs are off", { status: 403 });
      return new Response(JSON.stringify([{ id: "mine", name: "Mine", size: 10 }]));
    });
    const onRemove = vi.fn(() => 2);
    render(<UserPacks currentLookId="mine" onPick={() => {}} onRemove={onRemove} />);
    await act(async () => {});
    await act(async () => void fireEvent.click(await screen.findByRole("button", { name: "Remove Mine" })));
    await act(async () => {});
    expect(log).toContain("DELETE /api/packs/mine");
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Couldn't remove Mine. It is still stored, and nothing that wears it was changed.");
  });

  it("a pack the server no longer has (404) is taken off the studio and out of the config like any removal", async () => {
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => (init?.method === "DELETE" ? new Response("", { status: 404 }) : new Response(JSON.stringify([{ id: "mine", name: "Mine", size: 10 }]))));
    const onRemove = vi.fn(() => 1);
    render(<UserPacks currentLookId="mine" onPick={() => {}} onRemove={onRemove} />);
    await act(async () => {});
    await act(async () => void fireEvent.click(await screen.findByRole("button", { name: "Remove Mine" })));
    await act(async () => {});
    expect(onRemove).toHaveBeenCalledWith("mine");
    expect(screen.getByRole("status").textContent).toBe("Removed Mine. A place that wore it now draws Classic.");
  });

  it("one nothing wears is removed without that line", async () => {
    server([{ id: "mine", name: "Mine", size: 10 }]);
    render(<UserPacks currentLookId="classic" onPick={() => {}} onRemove={() => 0} />);
    await act(async () => {});
    await act(async () => void fireEvent.click(await screen.findByRole("button", { name: "Remove Mine" })));
    await act(async () => {});
    expect(screen.getByRole("status").textContent).toBe("Removed Mine.");
  });
});
