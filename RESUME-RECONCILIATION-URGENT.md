# Urgent cloud reconciliation build

This build replaces the empty-cloud-only migration with a resumable, additive reconciliation workflow.

## What it does
- Reads existing IDs per workspace/table.
- Skips rows whose IDs already exist.
- Inserts only missing rows.
- Retries transient failures up to three times and checks whether a write succeeded despite a lost response.
- Does not delete local or cloud rows.
- Can be run again after a partial failure; matching IDs are skipped.

## Before deploying/running
1. Download a fresh local backup in the app.
2. Upload the files from this folder to the existing test branch, replacing corresponding app files (do not create a nested app folder).
3. Wait for the Vercel deployment to finish.
4. Sign in and tap **Check cloud record counts**.
5. Tap **Resume / reconcile local data** once and confirm.
6. If it pauses on a network error, read the reported table/index and run the same reconciliation again; already-existing IDs will be skipped.
7. Compare counts with local backup: contacts 52, products 54, shares 273, activity 500; verify templates separately. Counts may include non-local cloud-only records, so inspect discrepancies before treating sync as complete.

## Safety notes
- This does not delete cloud records, resolve conflicting edits, or sync deletions/tombstones.
- Existing matching IDs are skipped, not overwritten. This protects cloud-side data during recovery.
- Run first on the current test deployment and keep the backup.
- Live Supabase testing is still required; do not claim complete until all counts and two-account sync are verified.
