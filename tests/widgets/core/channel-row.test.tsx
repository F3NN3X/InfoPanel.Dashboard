// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CHANNEL_TRACK, ChannelRow, STEREO_BAR, STEREO_GAP } from "@/widgets/core/channel-row";

const row = (extra: Partial<Parameters<typeof ChannelRow>[0]>) => render(<ul><ChannelRow name="Music" value="80" {...extra} /></ul>).container.querySelector("li")!;

describe("ChannelRow", () => {
  it("draws the bar cell as given when there is no stereo pair", () => {
    const li = row({ bar: <i data-bar="" /> });
    expect(li.querySelectorAll("[data-bar]").length).toBe(1);
    expect(li.querySelectorAll(`[style*="height: ${STEREO_BAR}px"]`).length).toBe(0);
  });

  it("draws a stereo pair as two thin bars, as tall together as one bar", () => {
    expect(2 * STEREO_BAR + STEREO_GAP).toBe(CHANNEL_TRACK);
    const li = row({ stereo: [<i key="l" data-ch="l" />, <i key="r" data-ch="r" />] });
    expect(li.querySelectorAll(`[style*="height: ${STEREO_BAR}px"]`).length).toBe(2);
    expect([...li.querySelectorAll("[data-ch]")].map((n) => n.getAttribute("data-ch"))).toEqual(["l", "r"]);
  });

  it("draws the trailing line after the value, and nothing without it", () => {
    expect(row({ bar: <i /> }).children.length).toBe(row({ bar: <i />, trailing: <p className="col-span-full" data-trail="">chips</p> }).children.length - 1);
    const li = row({ bar: <i />, trailing: <p className="col-span-full" data-trail="">chips</p> });
    expect(li.lastElementChild?.getAttribute("data-trail")).toBe("");
  });
});
