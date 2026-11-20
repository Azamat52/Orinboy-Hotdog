# Xonqa Hotdog v8 — source review and UI fixes

- Inspected the existing React app, site styles, routes, cart and admin components.
- Fixed IntersectionObserver lifecycle and dynamic product registration; observed items animate once on entering viewport.
- Scroll progress uses actual scroll position / scrollable document height and updates on resize and DOM changes.
- Customer typography, admin shortcut, cart drawer, and scrollbars improved.
- Removed two redundant CSS visibility override blocks that prevented animations from being visible.
- Preserved backend, authentication, ordering, routes and dependencies. No speculative dependency removal: package usage must be validated by a full build first.
- Existing CSS has legacy compressed rules; reducing lines without changing cascade behavior requires broader component migration. No false claim of full Tailwind migration.
- Test locally with npm ci, npm run typecheck, npm test, npm run build.
