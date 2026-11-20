# v18 — Guest cart authentication feedback

- Guest Add to Cart now redirects to `/profil/login`, showing an explanation and registration tab.
- Guest Open Cart now redirects rather than silently doing nothing (`cartReady` previously blocked the guest click).
- Guest product/promo detail actions also redirect with `next=` preserving product detail URL.
- After normal login/registration the user returns to the requested page; after requesting a cart the cart opens.
- Google OAuth redirect also retains `next` on return.
- Existing login requirement and cart persistence are retained; no guest checkout implemented.
- Build and browser end-to-end tests are still required.
