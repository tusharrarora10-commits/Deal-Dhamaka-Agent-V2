Deal Dhamaka Agent — Recipients tab addition

This is an additive change for the existing Deal-Dhamaka-Agent-Rebuild repository. It does not replace app.js or change the dealDhamakaAgentV2 storage key.

FILE TO ADD
- recipients-tab.js (included)

ONE-LINE CHANGE TO index.html
Find the existing script section at the bottom:
  <script src="followup.js"></script>
  <script src="undo-redo.js"></script>

Add this line after undo-redo.js and before </body>:
  <script src="recipients-tab.js"></script>

SAFE DEPLOY STEPS ON IPHONE
1. Keep the current main branch and production deployment unchanged.
2. In GitHub, open the Deal-Dhamaka-Agent-Rebuild repository.
3. Create a new branch from main named add-recipient-details-tab.
4. Upload recipients-tab.js to the repository root on that branch.
5. Edit index.html on that same branch and add the script line shown above.
6. Commit both changes to the branch and open a pull request into main.
7. Wait for the Vercel preview to deploy. Open the preview and test the new Recipients tab.
8. Verify the counts, search, order-status filter, date filters, Product Ordered checkbox, and refresh persistence.
9. Only merge after the preview passes. Keep your JSON backup.

WHAT IT DOES
- Adds a Recipients tab before Settings.
- Displays share attempts, marked ordered, and not marked ordered counts.
- Shows recipient, brand/product, date/time, phone, status, and Product Ordered checkbox.
- Includes search, order-status filter, date filters, and clear filters.
- Reuses existing records and order toggle; no separate database is created.

Note: This file has passed a JavaScript syntax check, but it has not yet been deployed or end-to-end tested in the user's browser. Test the preview before merging.
