// The Widget shell every template renders into: measures itself, applies skin + surface, picks the view.
import React, { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useBox, pickBy } from './layout';
import { mix } from './tokens';
import { SURFACES, SKINS, SkinCtx } from './theme';
import { CompactView, StudioView, SkinHeader } from './views';

export const shell = (p) => ({ accent: p.accent, surface: p.surface, radius: p.radius, size: p.size, showHeader: p.showHeader, className: p.className, style: p.style && typeof p.style === 'object' ? p.style : undefined, title: p.title, compactView: p.compactView, skin: p.skin, graph: p.graph, meter: p.meter, variant: p.variant });

export function Widget({ title, icon, accent, surface, radius, size, showHeader = true, right, className = '', style, children, bleed, compact, compactView, skin = 'default', graph, meter, variant, studio }) {
  const [ref, box] = useBox(size);
  // tier/shape come from the outer box; layouts get the inner content size (after padding + header)
  const cref = useRef(null);
  const [inner, setInner] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = cref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setInner({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const sk = SKINS[skin] ?? SKINS.default;
  const ctx = React.useMemo(() => ({ skin, ...sk, graph: graph && graph !== 'auto' ? graph : sk.graph ?? 'area', meter: meter && meter !== 'auto' ? meter : sk.meter ?? 'bar' }), [skin, graph, meter]);
  const isStudio = variant === 'studio';
  const surf = SURFACES[!surface || surface === 'auto' ? sk.surface ?? (isStudio ? 'studio' : 'solid') : surface] ?? SURFACES.solid;
  const sObj = isStudio ? ((typeof studio === 'function' ? studio(box) : studio) ?? (typeof compact === 'function' ? compact({ ...box, shape: 'tile' }) : compact) ?? { label: title, value: '' }) : null;
  const cObj = !isStudio && (typeof compact === 'function' ? compact(box) : compact);
  const useCompact = !!cObj && compactView !== 'off' && box.shape !== 'box';
  const tui = skin === 'tui';
  const pad = isStudio ? (box.h < 100 || (box.w / box.h >= 2.6 && box.h < 130) ? 'px-3 py-0' : 'px-3 py-2.5') : bleed && !useCompact ? '' : tui ? (useCompact ? 'px-[14px] pb-3 pt-[16px]' : 'px-[14px] pb-[12px] pt-[16px]') : useCompact ? (box.shape === 'strip' && box.h < 130 ? 'px-4 py-2.5' : box.w < 132 || box.h < 132 ? 'p-2.5' : 'p-3') : pickBy(box.size, { xs: 'p-2.5', sm: 'p-3', md: 'p-4', lg: 'p-5' });
  const header = !isStudio && showHeader && title && (tui || (!useCompact && box.size !== 'xs'));
  return (
    <SkinCtx.Provider value={ctx}>
      <div ref={ref} style={{ '--accent': sk.accent ?? accent ?? '#34d399', borderRadius: radius ?? sk.radius ?? 16, fontFamily: sk.font, ...surf.s, ...style }}
        className={`relative flex h-full w-full min-w-0 flex-col overflow-hidden text-zinc-100 antialiased ${surf.c} ${pad} ${className}`}>
        {tui && <div className="pointer-events-none absolute inset-[5px] rounded-[4px] border" style={{ borderColor: mix(45, '#3f3f46') }} />}
        {skin === 'hud' && ['left-1.5 top-1.5 border-l border-t', 'right-1.5 top-1.5 border-r border-t', 'left-1.5 bottom-1.5 border-l border-b', 'right-1.5 bottom-1.5 border-r border-b'].map((c) => (
          <span key={c} className={`pointer-events-none absolute h-2.5 w-2.5 ${c}`} style={{ borderColor: 'var(--accent)' }} />
        ))}
        {header && <SkinHeader kind={sk.header} title={title} icon={icon} right={right} bleed={bleed} />}
        <div ref={cref} className="relative min-h-0 flex-1">
          {isStudio ? <StudioView c={sObj} w={box.w} h={box.h} icon={icon} />
            : useCompact ? <CompactView c={cObj} shape={box.shape} w={box.w} h={box.h} icon={icon} />
            : typeof children === 'function' ? children({ ...box, w: inner.w || box.w, h: inner.h || box.h, outerW: box.w, outerH: box.h }) : children}
        </div>
      </div>
    </SkinCtx.Provider>
  );
}
