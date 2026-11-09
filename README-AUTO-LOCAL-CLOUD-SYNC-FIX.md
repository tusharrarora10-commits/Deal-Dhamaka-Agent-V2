# Automatic Local ↔ Shared Cloud Sync Fix

## Root cause fixed
The localStorage hook called `schedulePush()` only when `syncing` was false, while `schedulePush()` itself immediately returned when `syncing` was false. As a result, normal app saves made after the realtime channel started never scheduled an upload.

## Changes
1. Corrected the localStorage save hook so changes to `dealDhamakaAgentV2` and `dealDhamakaWhatsAppTemplatesV1` schedule cloud writes while authenticated sync is active.
2. Startup and sign-in now pull cloud rows, preserve local-only rows, establish a cloud-only baseline, start realtime subscriptions, and upload local-only additions/edits.
3. A cloud-only baseline is retained after pulls, so records already on the device but missing from cloud are not mistakenly treated as synchronized.
4. After cloud pulls, the app reloads its in-memory state and rerenders the active page; the dashboard also refreshes in the same tab.
5. The service-worker cache version was incremented so the new JS is not hidden behind the prior offline cache.
6. Session restoration and multi-select manual share/order entry from the supplied ZIP are retained.

## Data safety and behavior
- Local-only records are uploaded; cloud records are merged into local data.
- Matching IDs are refreshed from cloud. Existing local-only records are preserved and uploaded.
- This update does not propagate deletions. Deletion sync needs explicit tombstones/soft-delete handling to avoid accidental mass deletion when one device has incomplete local data.
- No service-role key is used in the frontend.

## Verification
All 17 JavaScript files passed `node --check`; ZIP integrity passed. This package has not been live-tested against the user's Supabase project or Vercel deployment. After deployment, sign in once on each device, leave the app online, create a test contact on A, verify it appears on B, edit it on B, and verify A refreshes. Check cloud counts and retain a backup before production use.
