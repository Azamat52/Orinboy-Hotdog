# v13 — Navbar alignment and ScrollSpy fix

- Centered desktop navigation inside fixed header, with hamburger behavior unchanged below 1351px.
- Smooth-scroll clicks update active link and URL immediately without being overwritten by intermediate scroll positions.
- Manual scrolling and IntersectionObserver continue synchronizing active link and URL.
- Floating background pill follows hover, keyboard focus, and returns to active link on mouse leave.
- One slim scroll progress track remains under the header.
- No changes to ordering, authentication, or admin logic.
