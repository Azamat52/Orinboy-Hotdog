# Redux refactor v23

- Added Redux Toolkit store and slices: admin, settings, site, reservation.
- `<Provider store={store}>` is now mounted at the React root.
- Replaced custom `useSyncExternalStore` implementation with typed React Redux selectors/dispatch and a compatibility setter to preserve existing calls. The compatibility hook is intentionally temporary; further modularization can move feature-specific async effects into thunks.
- Added `@reduxjs/toolkit` and `react-redux` to dependencies. The npm registry was unavailable in the packaging environment. **Run `npm install` to regenerate package-lock.json** before using `npm ci`. TypeScript/build/runtime checks could not be completed.
- Conservatively moved old changelogs to `docs/history`; no unverified 'unused' source was deleted because that can break runtime routes.
- Auth 400 display now uses Supabase error.code where present. This is not proof that a backend configuration issue was fixed; see SUPABASE-AUTH-CHECKLIST.md.
