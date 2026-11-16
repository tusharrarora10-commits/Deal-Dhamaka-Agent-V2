# Cloud wipe while preserving local Deal Dhamaka data

## What the new Settings action does

Settings → Shared Cloud → **Delete ALL cloud data (keep local data)** permanently deletes this workspace's application rows from:

- `dd_contacts`
- `dd_products`
- `dd_shares`
- `dd_activity`
- `dd_templates` (including WhatsApp template rows)

It does not delete localStorage data, Supabase Auth users, `dd_workspaces`, or `dd_workspace_members`. Those account/workspace records are retained so the existing shared workspace can be used again.

## Safe operating sequence

1. Keep the local JSON backup already downloaded.
2. Sign out of or close Deal Dhamaka on every other device/browser first. This prevents an already-running client from re-uploading its local rows while the cloud is being cleared.
3. Deploy this ZIP and open the app on the device whose local data you intend to keep.
4. Settings → Shared Cloud → Delete ALL cloud data (keep local data). Type exactly `DELETE ALL CLOUD DATA`.
5. Confirm cloud counts are zero. The app sets a local pause flag and does not automatically load or upload cloud data after the wipe.
6. Make any required changes to the preserved local data.
7. When ready, press **Resume / reconcile local data**. It inserts missing local IDs into the empty cloud and verifies the resulting counts. Successful reconciliation removes the pause flag and starts real-time sync.
8. Only then open the app on the other device and load/use the shared cloud.

## Important

- The delete action is destructive and cannot be undone from the app. Keep the JSON backup.
- If deletion stops part-way because of an RLS or network error, sync remains paused. Check counts and fix the reported permission/network issue before retrying.
- This action is scoped to the currently verified workspace. It does not delete other workspaces.
- Do not use the Supabase service-role key in the browser. The action uses the signed-in user's permissions and requires a valid DELETE RLS policy on all five `dd_*` data tables.
