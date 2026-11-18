# Cloud reset and local restore

This build changes the Shared Cloud workflow so sign-in does not import old cloud records.

## Recommended sequence
1. Open the app on the device that has the correct/latest local records.
2. Settings → Shared Cloud → sign in to Supabase.
3. Download local backup.
4. Select **Clear old cloud & sync this device** and confirm both prompts.
5. Keep the app open until the operation reports verified counts and real-time sync is listening.
6. Only then open the updated build on the other device. Sign in there; do not use an older app build.

## What it does
- Deletes rows only for the signed-in workspace from `dd_contacts`, `dd_products`, `dd_shares`, `dd_activity`, and `dd_templates`.
- Uploads this device's local contacts, products, shares, activity and WhatsApp templates.
- Verifies cloud counts against the local counts before enabling real-time sync.
- Does not delete localStorage data.
- Does not automatically pull old cloud records at sign-in or app reopen.
- Uses Supabase JS persistent browser localStorage for the login session.

## Important
This is a destructive workspace-level cloud reset. Other members/devices in the same workspace will see the new cloud dataset. Back up first. If a reset is interrupted, the app warns that cloud may be partially cleared/repopulated; do not load cloud data. Retry after reviewing counts. Supabase RLS must permit DELETE and INSERT/UPSERT for the signed-in workspace. Browser storage must persist; private browsing or clearing Safari website data can still remove saved sessions.
