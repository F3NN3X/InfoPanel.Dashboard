// The one set of render measures for a worn pack (ledger L71, L79, L94): what the browser drew, read from the page it runs in. The
// specs hand `measurePack` to `page.evaluate` for the built-in packs, the studio's render check runs it in its hidden frame on a
// user pack, so a rule added here holds for both. `measurePack` therefore names nothing outside its own body: it is sent to the
// browser as source text. Everything here is read in one task, with no await, so the demo streams cannot change the page between
// a pack's page and its twin.

export interface MeasureOptions {
  /** The pack's Look id. */
  look: string;
  /** The most an overlay or an effect may show (`OVERLAY_MAX`'s rule). */
  alphaMax: number;
  /** The least effective opacity of text and marks. */
  minOpacity: number;
}

export interface GaugeInk {
  key: string;
  lit: boolean;
}

/** A text node's contrast with what is behind it; `ratio` is null where that cannot be read (an image behind it, a gradient fill of its own). */
export interface TextInk {
  key: string;
  ratio: number | null;
  text: string;
}

/** The best contrast a spark, icon, threshold, range or fader draws with: a mark may hold a faint track, so one clear stroke is what says it is there. */
export interface MarkInk {
  key: string;
  part: string;
  ratio: number | null;
}

export interface Measured {
  /** What hides content on this page, one line each. */
  problems: string[];
  cards: number;
  /** The rings that drew a gradient stroke. */
  gradients: number;
  gauges: GaugeInk[];
  texts: TextInk[];
  marks: MarkInk[];
  /** The opaque header and chip bars read, and what sits on one and does not read on it. */
  bars: number;
  barIssues: string[];
}

export interface Twin {
  /** The page with the pack's stylesheet on. */
  worn: Measured;
  /** The same page in the same task with `<style data-pack>` off: what the pack's tokens draw without its CSS. */
  bare: Measured;
}

/** Reads the page with the pack's stylesheet on, and off. Sent to the browser as source: see the file's head. */
export function measurePack({ look, alphaMax, minOpacity }: MeasureOptions): Twin {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  const seen = new Map<string, number[]>();
  // a colour string of any syntax as [r, g, b, a]: the canvas parses color-mix and the rest
  const rgba = (c: string): number[] => {
    const known = seen.get(c);
    if (known) return known;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const read = [d[0], d[1], d[2], d[3] / 255];
    seen.set(c, read);
    return read;
  };
  const lum = ([r, g, b]: number[]) => {
    const f = (v: number) => (v / 255 <= 0.03928 ? v / 3294.6 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (x: number[], y: number[]) => (Math.max(lum(x), lum(y)) + 0.05) / (Math.min(lum(x), lum(y)) + 0.05);
  const over = (top: number[], under: number[], alpha = top[3]) => [0, 1, 2].map((k) => top[k] * alpha + under[k] * (1 - alpha)).concat(1);
  const alphaOf = (c: string) => (c.startsWith("rgba") ? Number(c.split(",")[3].replace(")", "")) : c === "transparent" ? 0 : 1);
  // one read of a page of hundreds of cards: each element's opacity down from its card once
  const faded = new Map<Element, number>();
  const effective = (el: Element, stopAt: Element): number => {
    if (el === stopAt.parentElement) return 1;
    const known = faded.get(el);
    if (known !== undefined) return known;
    const o = Number(getComputedStyle(el).opacity) * (el.parentElement ? effective(el.parentElement, stopAt) : 1);
    faded.set(el, o);
    return o;
  };
  // the card's face: the nearest opaque background up the tree
  const cardBg = (card: Element) => {
    for (let n: Element | null = card; n; n = n.parentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c[3] > 0.9) return c;
    }
    return [0, 0, 0, 1];
  };
  /** The colours an element's text may sit on: its backgrounds laid over the first opaque one up the tree; a gradient that fills the box gives one per stop, an image none (undefined). Art in corners or strips (several layers, or a size of its own) is not the surface. */
  const behind = (el: Element): number[][] | undefined => {
    const layers: number[][] = [];
    for (let n: Element | null = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const image = cs.backgroundImage;
      if (image !== "none" && image.match(/(gradient|url)\(/g)?.length === 1 && cs.backgroundSize === "auto") {
        const stops = image.match(/rgba?\([^)]*\)/g);
        if (!stops || image.includes("url(")) return undefined;
        return stops.map((stop) => layers.reduceRight((under, layer) => over(layer, under), over(rgba(stop), [0, 0, 0, 1])));
      }
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0.9) return [layers.reduceRight((under, layer) => over(layer, under), over(c, [0, 0, 0, 1], 1))];
      if (c[3] > 0) layers.push(c);
    }
    return [layers.reduceRight((under, layer) => over(layer, under), [0, 0, 0, 1])];
  };

  const read = (): Measured => {
    const problems: string[] = [];
    // the stage: layers and effects never take a click and the overlays stay under the cap
    for (const el of document.querySelectorAll("[data-pack-layer], [data-pack-effect]")) {
      const cs = getComputedStyle(el);
      if (cs.pointerEvents !== "none") problems.push(`${el.getAttribute("data-pack-effect") ?? "layer"} takes pointer events`);
      if (el.hasAttribute("data-pack-effect") && Number(cs.opacity) > alphaMax) problems.push(`effect ${el.getAttribute("data-pack-effect")} opacity ${cs.opacity} is over ${alphaMax}`);
      if (el.getAttribute("data-pack-layer") === "overlay" && alphaOf(cs.backgroundColor) > alphaMax) problems.push(`overlay background alpha ${cs.backgroundColor}`);
    }
    const marks: Record<string, number> = {};
    const cards = [...document.querySelectorAll("[data-wp-tier]")];
    const texts: TextInk[] = [];
    const inks: MarkInk[] = [];
    // each card's track colour, from a probe in it: all appended first and read after, so the page restyles once, not once per card
    const probes = cards.map((card) => {
      const probe = document.createElement("i");
      probe.style.background = "var(--w-track)";
      card.appendChild(probe);
      return probe;
    });
    const tracks = new Map(cards.map((card, c) => [card, getComputedStyle(probes[c]).backgroundColor]));
    for (const probe of probes) probe.remove();
    if (!cards.length) problems.push("no cards");
    else if (!cards.some((c) => c.textContent?.trim())) problems.push("no card has text");
    cards.forEach((card, c) => {
      const track = rgba(tracks.get(card) as string);
      faded.clear();
      const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
      let k = 0;
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent?.trim() || !t.parentElement) continue;
        const el = t.parentElement;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const words = t.textContent.trim().slice(0, 20);
        const gradientText = cs.webkitTextFillColor === "rgba(0, 0, 0, 0)" && cs.backgroundClip === "text" && cs.backgroundImage !== "none";
        if (alphaOf(cs.webkitTextFillColor || cs.color) === 0 && !gradientText) problems.push(`text "${words}" has a transparent fill`);
        const o = effective(el, card);
        if (o < minOpacity) problems.push(`text "${words}" is at opacity ${o.toFixed(2)}`);
        const ink = rgba(cs.webkitTextFillColor || cs.color);
        const under = gradientText ? undefined : behind(el);
        texts.push({ key: `${c}:${k++}`, ratio: under ? Math.min(...under.map((b) => ratio(over(ink, b, ink[3] * o), b))) : null, text: words });
      }
      // the marks with no value of their own to test: anything they paint, read against what is behind it
      card.querySelectorAll('[data-part="spark"], [data-part="icon"], [data-part="threshold"], [data-part="range"], [data-part="fader"]').forEach((mark, m) => {
        const under = behind(mark);
        const paints = [mark, ...mark.querySelectorAll("*")].flatMap((el) => {
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") return [];
          const shape = el instanceof SVGGeometryElement;
          return [shape ? (cs.stroke !== "none" ? cs.stroke : cs.fill) : cs.backgroundColor].filter((p) => p !== "none" && !p.startsWith("url(")).map((p) => ({ ink: rgba(p), o: Number(cs.opacity) * (shape ? Number(cs.strokeOpacity) : 1) }));
        });
        const drawn = paints.filter(({ ink, o }) => ink[3] * o > 0);
        inks.push({ key: `${c}:${m}`, part: mark.getAttribute("data-part") as string, ratio: under && drawn.length ? Math.max(...drawn.flatMap(({ ink, o }) => under.map((back) => ratio(over(ink, back, ink[3] * o), back)))) : null });
      });
      // every gauge has a value mark you can see: a ring's value arc, a bar's or meter's lit cells
      for (const gauge of card.querySelectorAll('[data-part="ring"], [data-part="bar"], [data-part="meter"]')) {
        const part = gauge.getAttribute("data-part");
        if (part === "ring") {
          for (const arc of gauge.querySelectorAll("circle[data-wp-ring]")) {
            marks.ring = (marks.ring ?? 0) + 1;
            const cs = getComputedStyle(arc);
            const trackArc = arc.previousElementSibling ? getComputedStyle(arc.previousElementSibling) : null;
            // a gradient stroke (`ring-fill`): every stop of the gradient it names is drawn, and each shows against the card
            const gradient = /^url\(["']?#([^"')]+)/.exec(cs.stroke);
            if (gradient) {
              const stops = [...(arc.closest("svg")?.querySelectorAll(`#${CSS.escape(gradient[1])} stop`) ?? [])].map((stop) => getComputedStyle(stop));
              marks.gradient = (marks.gradient ?? 0) + 1;
              if (stops.length < 2) problems.push("a ring's gradient has fewer than two stops");
              for (const stop of stops) if (rgba(stop.stopColor)[3] === 0 || Number(stop.stopOpacity) < minOpacity) problems.push("a ring's gradient has a stop that is not drawn");
              else if (ratio(rgba(stop.stopColor), cardBg(card)) < 1.3) problems.push(`a ring's gradient stop ${stop.stopColor} has no contrast with the card`);
              if (!(parseFloat(cs.strokeWidth) > 0) || effective(arc, card) * Number(cs.strokeOpacity) < minOpacity) problems.push("a ring's gradient arc is not drawn");
              continue;
            }
            const [r, g, b, a] = rgba(cs.stroke);
            if (cs.stroke === "none" || a === 0) problems.push("a ring's value arc has no stroke");
            else if (!(parseFloat(cs.strokeWidth) > 0)) problems.push("a ring's value arc has no stroke width");
            else if (effective(arc, card) * Number(cs.strokeOpacity) < minOpacity) problems.push("a ring's value arc is faint");
            else if (trackArc && cs.stroke === trackArc.stroke) problems.push("a ring's value arc is drawn in its track colour");
            else if (ratio([r, g, b], cardBg(card)) < 1.3) problems.push(`a ring's value arc ${cs.stroke} has no contrast with the card`);
          }
          continue;
        }
        // the lit cells and the fill: painted descendants that are not the track colour
        const lit = [...gauge.querySelectorAll("*")].filter((n) => {
          const cs = getComputedStyle(n);
          return (rgba(cs.backgroundColor)[3] > 0 && rgba(cs.backgroundColor).join() !== track.join()) || cs.backgroundImage !== "none";
        });
        const bg = cardBg(card);
        for (const n of lit) {
          const cs = getComputedStyle(n);
          if (effective(n, card) < minOpacity || cs.visibility === "hidden") problems.push(`a ${part}'s value mark is hidden`);
          else if (cs.backgroundImage === "none" && ratio(rgba(cs.backgroundColor), bg) < 1.3) problems.push(`a ${part}'s value mark ${cs.backgroundColor} has no contrast with the card`);
        }
        marks[part as string] = (marks[part as string] ?? 0) + lit.length;
      }
    });
    // a value of 0 lights nothing, so a bar may be empty, but across the screen every gauge kind that is drawn has a value mark
    for (const part of ["ring", "bar", "meter"]) if (cards.some((c) => c.querySelector(`[data-part="${part}"]`)) && !marks[part]) problems.push(`no ${part} on the screen has a lit value mark`);

    // each Widget QA frame's gauges by place: lit means a mark that is not the card's track
    const gauges: GaugeInk[] = [];
    [...document.querySelectorAll("figure[data-qa-module]")].forEach((fig, i) => {
      const card = fig.querySelector("[data-wp-tier]");
      if (!card) return;
      fig.querySelectorAll('[data-part="ring"], [data-part="bar"], [data-part="meter"]').forEach((gauge, n) => {
        const ring = gauge.getAttribute("data-part") === "ring";
        const ink = [...gauge.querySelectorAll(ring ? "circle[data-wp-ring]" : "*")].filter((el) => {
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || Number(cs.opacity) < 0.1) return false;
          if (ring) return cs.stroke !== "none" && rgba(cs.stroke)[3] > 0 && Number(cs.strokeOpacity) > 0.1;
          return (rgba(cs.backgroundColor)[3] > 0 && cs.backgroundColor !== tracks.get(card)) || cs.backgroundImage !== "none";
        });
        gauges.push({ key: `${i}:${fig.getAttribute("data-qa-module")}#${n}`, lit: ink.length > 0 });
      });
    });

    // what sits on a header or chip bar reads on it, 4.5:1 for text and 3:1 for icons (the P10 review's M4)
    const barIssues: string[] = [];
    let bars = 0;
    for (const bar of document.querySelectorAll(`[data-look="${look}"] [data-part="chip"], [data-look="${look}"] [data-part="tab"], [data-look="${look}"] [data-part="legend"]`)) {
      // a widget that sets its own surface (the Stream Deck's) is not wearing the pack's card, and its text colours do not follow it
      if (bar.closest("[data-wp-tier]")?.getAttribute("data-mat") !== `look-${look}`) continue;
      const bg = rgba(getComputedStyle(bar).backgroundColor);
      if (bg[3] < 0.9) continue;
      bars++;
      for (const el of [bar, ...bar.querySelectorAll("*")]) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.5) continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
        const icon = el instanceof SVGElement && el.tagName.toLowerCase() === "svg";
        if (!own && !icon) continue;
        const r = ratio(rgba(cs.color), bg);
        if (r < (icon ? 3 : 4.5)) barIssues.push(`${el.outerHTML.slice(0, 200)} ${icon ? "icon" : "text"} ${cs.color} on ${getComputedStyle(bar).backgroundColor} is ${r.toFixed(2)}:1 (${bar.getAttribute("data-part")})`);
      }
    }
    // A pack that paints no bar (Neon Stripe, Swiss Mono, Holo) reads its headers on the card's own flat colour.
    if (bars === 0) {
      for (const header of document.querySelectorAll(`[data-wp-tier][data-look="${look}"][data-mat="look-${look}"] [data-part="header"]`)) {
        const card = header.closest("[data-wp-tier]") as HTMLElement;
        const face = rgba(getComputedStyle(card).getPropertyValue("--w-mat-export").trim());
        if (face[3] < 0.9) continue;
        bars++;
        const r = ratio(rgba(getComputedStyle(header).color), face);
        if (r < 4.5) barIssues.push(`header ${header.textContent?.slice(0, 20)} ${getComputedStyle(header).color} on ${getComputedStyle(card).getPropertyValue("--w-mat-export")} is ${r.toFixed(2)}:1`);
      }
    }
    return { problems, cards: cards.length, gradients: marks.gradient ?? 0, gauges, texts, marks: inks, bars, barIssues: [...new Set(barIssues)] };
  };

  const worn = read();
  const sheets = [...document.querySelectorAll<HTMLStyleElement>("style[data-pack]")];
  for (const sheet of sheets) (sheet as HTMLStyleElement & { disabled: boolean }).disabled = true;
  const bare = read();
  for (const sheet of sheets) (sheet as HTMLStyleElement & { disabled: boolean }).disabled = false;
  return { worn, bare };
}

/** Text this far under its card is not read (the validator's `HIDDEN_TEXT_MIN`). */
export const READABLE_MIN = 3;
/** A mark this close to what is behind it is not seen (the bar a value mark is held to). */
export const MARK_MIN = 1.3;

/** The gauges `ref` lights and `now` does not. */
export function unlit(ref: readonly GaugeInk[], now: readonly GaugeInk[]): string[] {
  const at = new Map(now.map((g) => [g.key, g.lit]));
  return ref.filter((g) => g.lit && at.get(g.key) !== true).map((g) => g.key);
}

/** What a pack's CSS hides or makes unreadable: what its page shows that the same page without the CSS does not, one line each. The tokens were held to contrast by the validator, so only what the stylesheet changed is the stylesheet's. */
export function renderRefusals({ worn, bare }: Twin): string[] {
  const out: string[] = [];
  if (worn.cards === 0 || bare.cards === 0) out.push("no widget was drawn, so nothing could be checked");
  if (worn.texts.length === 0 || worn.texts.length !== bare.texts.length) out.push("the text of the widgets could not be read");
  const mine = (list: readonly string[], ref: readonly string[]) => [...new Set(list)].filter((p) => !ref.includes(p));
  out.push(...mine(worn.problems, bare.problems), ...mine(worn.barIssues, bare.barIssues));
  const hidden = unlit(bare.gauges, worn.gauges);
  if (hidden.length) out.push(`${hidden.length} gauge${hidden.length === 1 ? " is" : "s are"} no longer lit (${hidden[0]})`);
  const before = new Map(bare.texts.map((t) => [t.key, t.ratio]));
  const faint = worn.texts.filter((t) => {
    const was = before.get(t.key);
    return t.ratio !== null && t.ratio < READABLE_MIN && (was === null || was === undefined || t.ratio < was);
  });
  if (faint.length) out.push(`${faint.length} text${faint.length === 1 ? " is" : "s are"} under ${READABLE_MIN}:1 on what is behind ${faint.length === 1 ? "it" : "them"} ("${faint[0].text}" is ${(faint[0].ratio as number).toFixed(2)}:1)`);
  const was = new Map(bare.marks.map((m) => [m.key, m.ratio]));
  const lost = worn.marks.filter((m) => {
    const before = was.get(m.key);
    return before !== null && before !== undefined && (m.ratio === null || (m.ratio < MARK_MIN && m.ratio < before));
  });
  if (lost.length) out.push(`${lost.length} mark${lost.length === 1 ? " is" : "s are"} not seen on what is behind ${lost.length === 1 ? "it" : "them"} (a ${lost[0].part})`);
  return out;
}
