<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design lock — read before ANY UI work (non-negotiable)

There is ONE correct design. **Before creating or editing any UI component, page section, or
markup, open `docs/DESIGN-SYSTEM.md` (the readme sheet) and the canonical source it points to,
and replicate exactly.**

- **Add NOTHING that is not in the spec.** No extra links, buttons, labels, copy, sections, or
  affordances. Adding un-specced elements is a design deviation and is not allowed. (This rule
  exists because a "Read the full study summary →" link was invented and had to be removed.)
- **Never copy a component from another *generated* page** — generated pages may have deviated.
  Copy from the canonical captured HTML in `_migration/` or the gold-standard endometriosis page.
- **If a component is not yet in `docs/DESIGN-SYSTEM.md`, or the design is ambiguous, STOP and
  ASK** (or document it from the canonical source first). Do not improvise.
- Global rules (also in the spec): no purple/magenta, no bold, no em dashes, no lists, blue links
  are internal-only, right-rail connections max 3, sidebar labels short + universal.
