# Xonqa Hotdog v22 — URL/ScrollSpy and admin URL state

## Fixed
- Homepage URL uses canonical `/path?query#section` order; a page number only survives in its own section.
- Leaving `#menyu` removes stale `page`; leaving `#aksiyalar` removes stale `promoPage`.
- Pagination clicks activate their section and lock scroll detection during the smooth scroll.
- `ScrollReset` responds to pathname changes only, not every query/hash change.
- Admin products, categories, orders and promotions: 12-item URL-backed pages with query-controlled filtering where applicable.
- Admin order details sheet is addressable via `?order=<id>`; browser Back/Forward can restore it.
- Admin statistics interval is addressable via `?days=7` or `?days=30`.
- Mobile admin tabs now update the real route and only mount the current admin panel, preventing a hidden panel from reading another panel's filters.

## Verification limitations
TypeScript syntax transpilation passed for all changed files. Full TypeScript check, browser tests and production build cannot be verified here: the npm dependency cache is incomplete. No backend schema, authentication or ordering logic was changed. Check mobile admin navigation and browser Back/Forward on your device.

## Sample URLs
- `/?page=2#menyu`
- `/?promoPage=2#aksiyalar`
- `/#aloqa` (not `/?page=2#aloqa`)
- `/admin/products?q=cola&category=drinks&page=2`
- `/admin/orders?status=new&page=2`
- `/admin/orders?order=<order-id>`
- `/admin/stats?days=30`
