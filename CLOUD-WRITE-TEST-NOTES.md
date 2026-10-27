# Controlled Supabase write test

This build adds **Test cloud write (temporary row)** under Settings → Shared Cloud.

- It requires an explicit confirmation before running.
- It attempts one `INSERT` into `dd_contacts` using a unique `__dd_write_test_...` ID and a diagnostic-only payload.
- If insert succeeds, it immediately attempts a `DELETE` filtered by both the active `workspace_id` and that exact unique ID.
- It never updates or deletes existing user records intentionally.
- If insert succeeds but cleanup fails, the alert displays the exact temporary ID. Check `dd_contacts` and remove only that exact diagnostic row after verifying it.
- The test does not migrate local data or change RLS, schema, auth, or Realtime settings.

This has passed JavaScript syntax validation only. It has not been live-tested against the user's Supabase project. Run it in the Vercel preview first and share the full result before retrying migration.
