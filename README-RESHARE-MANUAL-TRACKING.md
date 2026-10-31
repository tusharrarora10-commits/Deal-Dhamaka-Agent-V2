# Resend eligibility and manual share tracking

- Send page now lists previously shared/non-eligible contacts separately for the selected product(s).
- Tick a contact to explicitly allow another send cycle. The permission is recorded as an activity event, using the existing cloud-synced activity payload table.
- After a new WhatsApp-open share is recorded, the resend permission is consumed. A further resend requires ticking again.
- Tracking page adds Manual Share / Order Entry. Select a contact and product, optionally tick ordered/received, then save. It creates a normal `shares` record, so existing dashboards, history, recipient counts and inventory calculations include it.
- Existing localStorage key and existing records are preserved. No database schema change.
- Not yet deployed or live-tested. Test with a dummy contact/product on both devices before production use.
