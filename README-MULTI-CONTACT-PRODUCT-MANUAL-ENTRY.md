# Multi-select Manual Share / Order Entry

## Enhancement
The Tracking tab's Manual Share / Order Entry now supports selecting multiple contacts and multiple products in one operation.

- Search contacts by name or phone.
- Search products by brand, product name, or product type.
- Select all / clear selections independently for contacts and products.
- The app displays the selected counts and the number of records to be created.
- Saving creates one share-history record for each selected contact × selected product combination.
- The optional ordered/received checkbox applies to every created combination.
- Existing `state.shares` and `save()` workflow is used, so the records flow into existing history, tracking and dashboard calculations and shared-cloud persistence.
- Existing records are not overwritten or deleted. Selecting a combination again intentionally creates another share event, reflecting a resend.

## Example
Selecting 3 contacts and 2 products creates 6 separate share records. If ordered/received is checked, all 6 are marked ordered.

## Validation
`node --check app.js` and ZIP integrity validation passed. This package has not been deployed or live-tested on the user's Vercel/iPhone environment.
