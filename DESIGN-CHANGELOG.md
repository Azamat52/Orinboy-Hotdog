# v7 — Navbar readability and reveal stability

- New white/light and charcoal/dark navigation surfaces, high-contrast text, compact order CTA.
- Responsive menu appears below 1450px, preserving all existing links and actions.
- Removed fixed-header overlap and old padding compensation.
- IntersectionObserver reintroduced with MutationObserver for dynamically loaded items. Elements are visible by default so content cannot disappear when observer fails.
- Existing routes, orders, checkout, authentication, Supabase integration unchanged.
