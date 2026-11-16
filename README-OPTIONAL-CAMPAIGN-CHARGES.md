# Optional Campaign support Charges

- Master checkbox controls all pending rows. Default for newly imported Excel rows: OFF (full amount payable).
- Brand-wise checkboxes control pending rows with the same brand name, including multiple contacts. Mixed brand selection appears indeterminate.
- Charge per selected brand row: ₹1–₹500: ₹5; above ₹500–₹1,000: ₹10; above ₹1,000: ₹20.
- Payment queue, CRED amount, summary, export, receipts use the chosen charges.
- On marking paid, the applied charge is saved on each paid row. Historical paid rows with no saved charge retain their prior charge logic.
- Payments are never automatically confirmed by CRED. Mark Paid only after checking the bank transaction.
- Backup data before deploying. Cloud sync depends on the existing bridge and should be tested with two devices.
