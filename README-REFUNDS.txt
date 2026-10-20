Deal Dhamaka Agent V2 — Refund tab addition

- Added a Refunds navigation tab without changing the localStorage key.
- Product search and checkbox selection filters eligible contacts to ordered share records.
- Shared/ordered state is read from existing share history.
- Refund checkbox and amount are stored as additional fields on each share record: refunded, refundedAt, refundAmount.
- Product-wide action marks ordered records for selected products; contact-wide action marks selected eligible records.
- Recipient timeline now includes a Refunded summary and Amt refunded column.
- Refund records are stored in dealDhamakaAgentV2; export a JSON backup before production deployment.
- This package has not been deployed to Vercel. Test a Preview before production.

- Added a live Refund Summary showing total amount refunded, count of refunded records, and eligible ordered records. Total is the sum of refundAmount for records marked refunded; editing a row amount updates the saved amount and summary.
