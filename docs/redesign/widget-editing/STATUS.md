# Status

Implemented on branch `feat/widget-editing` (see `SPEC.md`). The docs describe the shipped behaviour: `docs/architecture.md` (Studio layout, Quick bar), `docs/customization-guide.md` (Inspector placement, The quick bar).

## Deviations from the spec

- **Icons:** lucide icons instead of Material Symbols.
- **Default quick sets:** a rule, not a hand-picked list per widget. Before any pin a type shows Layout and Accent when it has them, then its first two own compact settings (max 4).
- **Sources view:** unchanged.
- **Quick bar room:** the page keeps the bar's top room clear whenever the bar is on, so selecting never refits the page.
- **Phone:** Undo / Redo live in the `⋯` menu; the top bar also hides the summary and the Kiosk view label.
