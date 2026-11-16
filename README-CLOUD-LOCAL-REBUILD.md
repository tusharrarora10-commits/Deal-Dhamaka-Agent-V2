# Rebuild shared cloud from this device's local data

The Settings > Shared Cloud card includes a destructive-but-local-preserving rebuild action. It is deliberately separate from ordinary sync.

## Behaviour
- Keeps the current browser's `dealDhamakaAgentV2` and `dealDhamakaWhatsAppTemplatesV1` localStorage values unchanged.
- Downloads a combined safety backup containing the current local records and all rows currently readable from the signed-in workspace tables.
- Requires the exact confirmation phrase `REBUILD CLOUD FROM THIS DEVICE`.
- Deletes rows scoped to the current `workspace_id` from `dd_contacts`, `dd_products`, `dd_shares`, `dd_activity`, and `dd_templates`. It does not delete `dd_workspaces`, `dd_workspace_members`, auth users, or other workspaces.
- Uploads the current device's local contacts, products, shares, activity, app templates, and WhatsApp templates.
- Verifies final cloud counts against the local source counts before reporting success and restarting realtime.

## Important
- This action replaces the shared workspace data with the data on the device where it is run. Use the device containing the correct/latest local dataset.
- The signed-in role must have SELECT, DELETE, and INSERT/UPSERT permissions under RLS for all five data tables. If DELETE is denied, the operation stops and local data remains untouched.
- If a network failure happens after clearing starts, cloud may be partially rebuilt. Local data remains intact. Keep the downloaded backup and retry only after checking the status message.
- Do not load cloud on another device until the final count verification reports success.
- This feature was syntax-checked but cannot be live-tested against the user's Supabase project from this build environment.
