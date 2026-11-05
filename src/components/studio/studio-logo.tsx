/** The Frame mark: a screen inside the editor's selection corners, off-white tile with the dark glyph. */
export function StudioLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <rect width="28" height="28" rx="7" fill="#ededf0" />
      <g transform="translate(5.6 5.6) scale(0.7)" fill="none" stroke="#0c0c0e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" />
        <path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" />
        <path d="M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16" />
        <path d="M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
        <rect x="8" y="8" width="8" height="8" rx="2" fill="#0c0c0e" stroke="none" />
      </g>
    </svg>
  );
}
