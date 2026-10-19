Deal Dhamaka Agent V2 — Contact Counts & Sorting Patch

Changes:
- Fixed the Clear selection button colour using its actual DOM ID (#bulkFollowupClear).
- Contacts are sorted alphabetically by default (A–Z).
- Added per-contact counts for saved share records and records marked ordered.
- Added sorting by ordered count (high-to-low / low-to-high) and shared count.
- Added compact dark-mode styling for the counts and sort control.

Data safety:
- Keeps the existing dealDhamakaAgentV2 localStorage key.
- No stored data schema changes or migrations.
- Share counts use contactId, with phone matching fallback for older records without contactId.
- Counts represent share records; they do not claim delivery or verified purchases.

Test before production:
1. Deploy to a Vercel Preview.
2. Confirm Contacts defaults to A–Z.
3. Compare Shared and Ordered counts against a contact's Timeline.
4. Test all sort choices.
5. Confirm Clear selection remains readable in Tracking > Bulk WhatsApp Follow-ups.
6. Test WhatsApp follow-up selection and sending manually.
