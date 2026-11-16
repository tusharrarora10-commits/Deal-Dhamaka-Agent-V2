# Payment receipt and contact history fixes

1. WhatsApp receipt text now uses real line breaks rather than literal backslash-n sequences.
2. Campaign support Charges KPI shows charges across all payment rows (paid + pending), so paid charges remain visible after settlement. Net payable remains the pending net amount.
3. Payment queue rows are compact by default; a Details toggle reveals UPI, charge and paid timestamp. Date and contact filters apply to the queue and paid receipt history.
4. Contact cards show paid line count and gross paid amount. The contact Timeline includes all paid receipt batches, brand-wise details, charge/net totals and a Share this receipt action.
5. Receipt history retains the latest/previous labels and per-batch sharing.

Note: Older records without a batch ID use the saved paid timestamp grouped to the minute; new batches retain explicit IDs.
