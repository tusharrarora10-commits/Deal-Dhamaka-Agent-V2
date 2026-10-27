# Cloud migration correction

The initial migration now uses INSERT for each row instead of UPSERT with `onConflict: 'workspace_id,id'`. The migration already refuses to start unless all cloud tables are empty, so an upsert conflict target is unnecessary for the initial import. This aligns the migration path with the temporary insert test that succeeded and avoids relying on a composite conflict target during the first import.

Ongoing sync still uses upsert so existing rows can be updated. Migration remains sequential and local-first; local data is not deleted. If a later row fails after earlier inserts, check cloud counts before retrying because the import may be partially complete. Do not retry unless the cloud is empty or the remaining records have been reconciled.

This is a code-level correction based on the evidence available; it has not been live-tested against the user's Supabase project.
