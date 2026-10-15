# Deal Dhamaka Agent — corrected test build

This build preserves the existing `dealDhamakaAgentV2` localStorage key and keeps all data on the current browser/device.

## Included fixes
- Restores working Edit, Delete, Close Deal and Reopen Deal actions for products and working Edit/Delete actions for contacts.
- Adds a Deal Overview panel to the Products tab.
- Keeps the compact seven-tab iPhone navigation and blue/green/navy color palette.
- Adds Deal Start Date and Deal End Date fields to product create/edit forms and product cards; validates end date is not earlier than start date.
- Adds new products to the top of the Products list.
- Current reports resolve brand/product type from the current product record and exclude share records linked to deleted products from live reports. History is retained.
- Adds per-tab Undo/Redo for local data changes (up to 80 states). This cannot undo a WhatsApp message after it has been sent.
- Bumps the service-worker cache version to avoid serving stale CSS/JavaScript.

## Deploy safely
1. Keep the JSON backup before replacing files.
2. Upload all files in this ZIP to the root of the **test branch** first, replacing files with matching names.
3. Test adding/editing/deleting a contact and product, closing/reopening a deal, changing a product type, date fields, reports, and Undo/Redo on iPhone.
4. Only promote to production after the preview passes.

No browser/device end-to-end test has been performed in this environment. Static JavaScript syntax checks are performed before packaging.
