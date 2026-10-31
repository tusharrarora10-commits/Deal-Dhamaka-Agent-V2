# Supabase login session restore fix

## Root cause found
The prior Reshare/Manual Tracking package initialized and mounted the Supabase login panel, but it did not call `auth.getSession()` on app startup. Therefore the UI defaulted to “Not signed in” after a full app close/reopen even when Supabase had persisted a valid session in browser storage.

## Fix applied
- Replaced only `cloud-setup.js` with the session-restore implementation.
- On app launch, it calls `auth.getSession()`, restores the signed-in identity and verifies workspace membership.
- If the session exists, it loads shared cloud records and restarts realtime sync.
- Cloud startup/RLS/network failures no longer force the UI to show a false signed-out state; the session is retained and the status explains the cloud issue.
- Supabase client continues to use `persistSession: true` and automatic token refresh.
- Reshare and manual share/order tracking enhancements from the prior package are retained.

## Verification
JavaScript syntax and ZIP integrity checks passed. This is not a live iPhone/Safari deployment test. After deploying, sign in once, fully close the installed app, reopen it, and confirm the status says session restored and the shared cloud loads. If iOS has separate Safari and Home Screen app website storage, sign in once in the same launch mode you normally use.
