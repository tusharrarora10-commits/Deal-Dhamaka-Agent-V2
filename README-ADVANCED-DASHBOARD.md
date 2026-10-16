# Deal Dhamaka Agent V2 — Advanced Dashboard Build

This build consolidates the Home page into one executive dashboard and keeps detailed, filterable reporting in Tracking.

## What's changed
- Financial KPIs: Shared Value, Ordered Value, Pending Order Value and Allotted Value.
- All-time / today / 7-day / 30-day / this-month / 90-day reporting filters (default: All Time).
- Share-versus-order trend chart, top brands and product types by value, recent activity and an Action Centre.
- Inventory snapshot: allotted, shared, pending allotted and pending ordered quantities, with over-allocation alerts.
- Product price snapshot saved for new share records. Existing records without a snapshot use the current product price as an estimate.
- Removed the overlapping analytics.js dashboard and duplicate Home inventory panel. Tracking remains the detailed report centre.
- Retains localStorage key `dealDhamakaAgentV2` and the existing contacts/products/shares structure.
- Includes the supplied fixed WhatsApp enhancement file.

## Important definitions
- Shared Value = sum of saved unit-price snapshots for share records in the selected period.
- Ordered Value = sum of those values for records marked ordered.
- Pending Order Value = sum of values for records not marked ordered.
- Allotted Value = current product unit price × allotted quantity.
- Opening a WhatsApp chat is a recorded share attempt, not confirmation of message delivery or a purchase.

## Deploy safely
1. Keep a JSON backup from Settings before replacing any live files.
2. Test this ZIP in a separate Vercel Preview deployment first.
3. Check Contacts, Products, Send, History, Tracking, import/export, undo/redo and WhatsApp on iPhone Safari.
4. Only then promote the validated build to production. Do not clear Safari website data.

This ZIP is a prepared code build; it does not itself change the GitHub main branch or an existing Vercel deployment.
