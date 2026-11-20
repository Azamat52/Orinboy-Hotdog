# v14 — ScrollSpy and customer typography

- Active section is measured against a viewport probe rather than the section top passing the navbar. `IntersectionObserver` schedules checks; actual scroll geometry resolves selection.
- On navigation clicks, URL hash and active link update immediately; the selection is held through programmatic smooth scroll. Wheel/touch/keyboard manual scrolling cancels that hold.
- Programmatic smooth scroll uses the actual sticky-header height and 12px breathing space.
- Scroll progress retains the 2px GPU-friendly transform implementation; no extra scrollbar.
- Customer-site text sizes increased, including desktop navigation, descriptions, product names and buttons. Admin styles are not modified.

Build verification could not run because `node_modules` is absent. Run `npm ci && npm run typecheck && npm run build && npm run dev` locally.
