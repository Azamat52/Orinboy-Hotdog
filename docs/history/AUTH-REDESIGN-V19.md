# Auth UI v19

- Sign-in and registration share a dark reference-inspired layout with mint buttons and animated route-preserving tabs (buttons, not links).
- No password confirmation, password-reset link, or scanner entry.
- Signup includes name, optional phone, email and password; Google OAuth remains.
- Signup no longer attempts to force a login if email verification is enabled. Shows a confirmation message instead.
- Improved localized error mapping and console diagnostics. Actual backend failures still require Supabase configuration/log inspection.
- Profile saving is best effort; it cannot hide a successful signup.
- Reduced-motion support, accessible error announcements and visible loading states.
- This revision does NOT change Supabase settings, database policies, or existing admin pages.
