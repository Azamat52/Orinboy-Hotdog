# V16: Customer cards and order-status notifications

- Restored the prior Sonner toaster component and removed the v15 globally themed dark/black toast styles.
- Only order-status notifications from `adminNotify` have an additional warm, status-colored treatment.
- Reworked customer product cards: inset rounded images, separate title and price hierarchy, dedicated full-width cart controls, clearer product-detail affordance, balanced spacing.
- Reworked promotion cards with inset rounded imagery and a distinct view-offer CTA.
- Rounded detail hero images and refined the customer detail CTA; admin pages and their cards remain unchanged.
- All cart callbacks, product URLs, data sources, and backend actions are preserved.

Note: Product photos are fetched from existing product data; an incorrectly uploaded screenshot/terminal image must be replaced in the admin product editor, not by styling.
