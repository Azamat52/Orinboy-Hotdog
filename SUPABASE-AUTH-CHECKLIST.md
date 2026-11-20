# Supabase registration HTTP 400 — diagnosis

The browser's HTTP 400 response does **not** tell us which backend setting is wrong. The response JSON's `code` and `msg` and Supabase Auth logs identify the cause. The project now displays a more specific message when an error code is available.

1. Open browser DevTools → Network → filter `signup` → click the request to `/auth/v1/signup` → Response. **Redact access tokens, keys, passwords, cookies and any personal information** before sharing. Record only `code`, `msg`, `status`.
2. Supabase dashboard → Authentication → Providers → Email: make sure email/password signups are enabled. Under Authentication → Settings, check whether signups are disabled.
3. Supabase dashboard → Authentication → URL Configuration: set your deployed Site URL and allowed Redirect URLs (including your local development address if needed).
4. Supabase dashboard → Logs → Auth: inspect the matching timestamp for a `database_error`, CAPTCHA error, mailer error, or restrictions. Email confirmation can require a working SMTP provider.
5. If error is `database_error`, check your existing `auth.users` triggers and any profile-table constraints. Do not delete triggers or disable row-level security as a workaround.
6. If you have access to SQL Editor, this **read-only** query lists the relevant auth-user triggers:

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';
```

Avoid changing your Supabase settings blindly. A 400 might also be caused by an invalid email or password policy, CAPTCHA, disabled signup, or an Auth trigger. Without the response's actual error code and Auth logs, a guaranteed backend fix isn't possible.
