# Deal Dhamaka Agent V2 — Supabase setup stage

This is a **staged setup package**, not a completed real-time-sync release. The existing app's localStorage behavior and `dealDhamakaAgentV2` key remain unchanged.

## Before opening the app
1. Open `supabase-config.js`.
2. Replace `PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE` with the project's `sb_publishable_...` key.
3. Never put a `sb_secret_` or service-role key in this file.
4. Deploy this package only to a private/test Vercel preview first.

## In the app
1. Open Settings → Shared Cloud (Setup).
2. Sign in with one of the Supabase users that has a row in `dd_workspace_members`.
3. Confirm the workspace is verified and inspect cloud record counts.
4. Download a local backup before migration.
5. The migration button is enabled only when the cloud tables are empty. It copies the app's five local arrays and the separate `dealDhamakaWhatsAppTemplatesV1` templates into the workspace, without deleting local data.

## Important limits of this stage
- No continuous automatic synchronization is enabled yet.
- It does not automatically download cloud records into the live app state.
- Deletes and conflict resolution are not synchronized yet.
- Do not treat this package as the final two-device real-time app or replace the production deployment with it until the record-level sync adapter is implemented and tested.
- The SQL schema/policies must already exist in Supabase, and both users must be members of the same workspace.
