// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PACK_IDS, PackStage, usePack } from "@/looks/pack";
import { BUILTIN, registerPack } from "@/looks/pack-load";
import { badPack, TEST_PACK } from "./__fixtures__/test-pack";

function Page({ lookId }: { lookId?: string }) {
  const pack = usePack(lookId);
  return (
    <main data-testid="page" data-pack={pack?.id ?? ""}>
      <PackStage pack={pack} className="fixed inset-0 -z-10" overlayClassName="fixed inset-0 z-10" />
    </main>
  );
}

afterEach(() => {
  cleanup();
  for (const id of ["test-pack", "bad-pack"]) {
    delete BUILTIN[id];
    PACK_IDS.delete(id);
  }
});

describe("usePack and PackStage", () => {
  it("loads a registered pack, mounts its stage and CSS, and takes the CSS out again", async () => {
    registerPack("test-pack", async () => ({ default: TEST_PACK }));
    const { unmount } = render(<Page lookId="test-pack" />);
    await waitFor(() => expect(screen.getByTestId("page").dataset.pack).toBe("test-pack"));
    await waitFor(() => expect(document.querySelectorAll("[data-pack-layer]").length).toBe(4));
    expect(document.head.querySelector('style[data-pack="test-pack"]')).not.toBeNull();
    unmount();
    expect(document.head.querySelector('style[data-pack="test-pack"]')).toBeNull();
  });

  it("shows nothing for Classic, an unregistered id, or a pack the loader refused", async () => {
    registerPack("bad-pack", async () => ({ default: badPack({ id: "bad-pack", css: '@import "x.css";' }) }));
    for (const lookId of [undefined, "classic", "unknown", "bad-pack"]) {
      render(<Page lookId={lookId} />);
      await new Promise((r) => setTimeout(r, 20));
      expect(screen.getByTestId("page").dataset.pack).toBe("");
      expect(document.querySelector("[data-pack-layer]")).toBeNull();
      cleanup();
    }
    expect(document.head.querySelector("style[data-pack]")).toBeNull();
  });
});
