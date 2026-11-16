# Consolidated receipt fix

## Expected workflow
1. In Payments, select all brand rows for the same contact.
2. Tap **Pay selected with CRED** once. The app validates that the selection belongs to one contact and prepares one payment amount.
3. The app now saves one shared receipt batch ID to all selected rows before opening CRED.
4. After verifying the payment succeeded in CRED/bank, return to the app and mark each selected brand row Paid if the app requires per-row confirmation.
5. The individual Paid rows retain the shared batch ID and appear together as one receipt with all brands, amounts, charge total and net amount.

If the user starts separate Pay actions for separate brands, those are treated as separate payment batches. Existing receipts already marked paid with different batch IDs are not automatically merged, because the app cannot safely infer whether they were one real-world transfer or separate transfers.
