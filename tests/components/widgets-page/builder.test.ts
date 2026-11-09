import { describe, expect, it } from "vitest";
import { tagPlace } from "@/components/widgets-page/builder";

// B12: the selection's name tag (24 px of room) never covers the weather credit line drawn under the blocks: room under a block
// is counted to the credit line's top, not to the zone's bottom.
describe("the selection's name tag", () => {
  it("goes under the block only when it fits above the credit line, else over the block, else inside it", () => {
    // a Repeat ending 14 px above the credit line, in a 300 px zone whose credit line starts at 270
    expect(tagPlace({ y: 40, h: 216 }, 270)).toBe("over");
    expect(tagPlace({ y: 40, h: 216 }, 300)).toBe("under");
    expect(tagPlace({ y: 40, h: 200 }, 270)).toBe("under");
    expect(tagPlace({ y: 10, h: 250 }, 270)).toBe("inside");
  });
});
