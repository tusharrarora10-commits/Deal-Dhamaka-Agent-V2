# Deal Dhamaka Agent V2 — Supabase cloud bridge

This package retains the existing localStorage key `dealDhamakaAgentV2`, current app scripts, multiple product links, manual WhatsApp sharing and bulk follow-up behavior.

## Current behavior
- Supabase sign-in uses the project's URL and publishable key in `supabase-config.js`. Never put a secret/service-role key in browser code.
- The migration only starts if all five workspace tables are empty. It downloads a backup first and never clears local storage.
- Migration errors display the underlying Supabase/network error details instead of only `TypeError: Load failed` where the SDK supplies details.
- After a successful import, the app starts a Realtime subscription and watches legacy localStorage writes to upsert changed records.
- The separate `dealDhamakaWhatsAppTemplatesV1` key is migrated and its updates are also upserted.
- “Load shared cloud data / start sync” merges cloud rows into local data and preserves local-only records.

## Important limitations before production
- Automatic deletion synchronization is deliberately not enabled; local-only records are preserved to prevent accidental loss. Implement tombstones/soft deletes before relying on cross-device deletions.
- Concurrent edits to the same record currently use last successful upsert wins; this is not a full conflict-resolution UI.
- Supabase Realtime must be enabled for `dd_contacts`, `dd_products`, `dd_shares`, `dd_activity`, and `dd_templates` in the project's `supabase_realtime` publication. Confirm via Database → Publications / Realtime settings.
- Validate RLS for both workspace members and verify that a non-member cannot read or write rows. Do not disable RLS.
- The integration must be tested in two browsers/devices before production promotion. Do not claim deployment until Vercel has built and the preview has passed manual verification.

## Safe rollout
1. Keep the JSON backup.
2. Deploy this package to the test branch only.
3. Sign in and check that cloud counts are all zero.
4. Migrate once. If it fails, inspect the detailed error and cloud counts before retrying.
5. Confirm counts: contacts 51, products 54, shares 273, activity 232, plus any saved templates.
6. Sign in as the second user on another device, choose “Load shared cloud data / start sync”, and test a harmless new test record before using real changes.
7. Verify cross-device updates and RLS. Only then consider promoting the release.
