# Deal Dhamaka Agent V2 — Dark Analytics Dashboard Revision

## Scope
This revision changes the dashboard presentation only. It keeps the existing page navigation, Recipients tab, `dealDhamakaAgentV2` localStorage key, data model, and WhatsApp follow-up code.

## Dashboard changes
- Dark navy analytics styling applied only inside the Home/Dashboard page.
- Colour-coded KPI cards for shared value, ordered value, pending order value, and allotted value.
- A separate visual share/order pipeline for Shared, Ordered, Pending, and Order Rate, with proportional progress bars.
- Existing time-series activity chart and brand/product-type rankings retained and recoloured for the dark theme.
- Dark-styled recent activity, action centre, inventory snapshot, refund summary, and dashboard shortcuts.
- Responsive spacing for narrow iPhone screens; other tabs retain their existing styles.
- Service-worker cache version bumped and the app's existing scripts included in the precache list so updated assets can be fetched together.

## Data and metric notes
- No localStorage key changes or migration is performed.
- Shared counts are saved share records, not verified WhatsApp delivery.
- Ordered counts are records marked ordered by the user.
- The order rate is marked-ordered share records divided by share records for the selected period.
- Existing dashboard financial calculations and filters are retained.

## Validation performed
- `node --check` passed for every JavaScript file in the package.
- All script paths referenced from `index.html` were checked and exist.
- Static checks confirmed the existing storage key and inclusion of `recipients-tab.js` and `bulk-followups.js` remain.
- A lightweight Node VM smoke test loaded `dashboard.js` against a mock DOM and sample in-memory records; it rendered KPI cards, the share/order pipeline, the trend chart, brand rankings, and pending status.

## Not verified
- No real browser or iPhone Safari end-to-end session was available for this revision.
- No WhatsApp message was sent as part of testing.
- This package has not been deployed to GitHub or Vercel.

## Safe preview test checklist
1. Export a JSON backup from the current live app.
2. Deploy this ZIP to a separate GitHub branch / Vercel Preview, not directly to production.
3. Confirm existing contacts, products, shares, order statuses, and refund records are present.
4. Switch dashboard periods (All time, Today, Last 7 days, Last 30 days, This month, Last 90 days); confirm cards and charts update.
5. Open Recipients, Products, Tracking, and Settings and verify navigation and data are unchanged.
6. Test a pending-order bulk follow-up and an ordered-recipient review flow without sending to unintended recipients.
7. Test backup export/import on a separate test copy before promoting to production.
