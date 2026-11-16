# Payment bulk mark-paid and receipt sharing fix

- Contact timeline receipt sharing now calls the payment receipt-share function directly; opening the Payments tab first is no longer required.
- Payment queue now has a separate **Mark selected as paid** action below **Pay selected with CRED**.
- Select multiple pending rows with their checkboxes, then use **Mark selected as paid**. The app confirms before changing status and records a common batch timestamp. Rows remain grouped into separate receipts by contact.
- This is a manual status action, not proof of a bank transfer. Use it only after confirming payment success in CRED/bank.

Existing CRED payment initiation remains unchanged.
