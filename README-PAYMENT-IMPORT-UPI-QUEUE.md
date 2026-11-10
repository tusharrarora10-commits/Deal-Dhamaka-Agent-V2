# Deal Dhamaka Agent V2 — Brand Payment Import & WhatsApp Receipts

## Excel import columns
Required:
- `Contact Name` — matched to the saved contact name
- `Brand Name` — appears on the payment register and receipt
- `Pending Amount` — numeric amount in INR

Optional: `Remarks`.

The saved contact supplies the WhatsApp number and UPI ID. Add both to the contact record before paying or sharing a receipt. Name matching ignores case and repeated spaces; unmatched contacts remain visible and must be resolved before payment.

## Payment and receipts
- Payment queue stores pending/paid status in the existing app activity data.
- The UPI button opens a payment intent prefilled with the saved UPI ID, amount and brand note.
- Mark an item paid only after checking the successful transaction in your UPI/bank app.
- Paid entries are grouped by contact. **Prepare receipt & share** generates a PNG showing the contact, WhatsApp number, each brand and amount, and the total.
- On supported iPhones/browsers, the native share sheet can share the PNG to WhatsApp; choose the intended contact. The app cannot silently send or force a WhatsApp recipient.
- If image sharing is unavailable, the PNG downloads and WhatsApp opens with the text summary; attach the downloaded image manually.

## Safety and limitations
The app cannot debit an account, confirm settlement, or verify bank transactions. Review the UPI ID, recipient and amount inside the UPI app before authorising. Never store UPI PINs, OTPs or bank credentials in this app. CRED is available only if the device offers it as a handler for the UPI intent; the app cannot force CRED specifically.

## Deployment
Back up current app data, extract the ZIP, upload the contents of `Deal-Dhamaka-Agent-V2-main` to the existing project root, commit and wait for Vercel deployment. Test import and receipt sharing with a small test record before relying on it.
