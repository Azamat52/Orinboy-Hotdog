# Architecture rules
- Normalize legacy combined delivery text in a browser-safe order details helper so saved web orders display separate map, payment and comment fields without rewriting historical records.
- Preserve the existing standalone React/Vite application and its routing; archive revisions must not migrate frameworks.
- Keep shared pagination and cart arithmetic in browser-safe helpers so both public lists and quantity updates follow the same rules.
- Read public promotions through the existing API, report query failures, and notify open tabs after successful promotion mutations so the public view does not silently remain stale.
- Keep storefront hours in one shared provider backed by the public hours API, save events and short polling so all shopping surfaces and the footer agree across tabs and devices.
- Validate working hours again in the existing order API before writing orders so a stale or bypassed browser cannot place a closed-hours order.
- Use shared visual loading indicators with accessible labels instead of visible loading text across public and admin states.

- Keep appearance in one app-wide provider keyed by authenticated user; mirror the resolved theme to profile rows and retain system mode in user metadata so admin and storefront never compete for document theme.

- Resolve visible cart rows through the shared helper; never remove stored cart rows merely because the menu is loading or failed to load, and ignore obsolete user-load results.
