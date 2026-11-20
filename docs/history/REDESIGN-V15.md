# v15 customer redesign and URL state

- Product and promotion cards, detail screens, controls, and customer toast notifications restyled.
- `?category=<id>&q=<term>&page=<n>` now drive homepage customer filters and menu pagination.
- `?promoPage=<n>` drives promotion pagination.
- `/?cart=open#menyu` opens the existing cart drawer for signed-in customers.
- Product and promotion add actions now guard duplicate submits while pending.
- Admin controls and backend service implementations are deliberately untouched.
- Browser regression testing and full dependency-backed build are still required.
