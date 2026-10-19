# Deal Dhamaka Agent V2 — Full App Dark Mode

## Changes
- Applied a consistent dark theme across all tabs: Dashboard, Contacts, Products, Send WhatsApp, History, Tracking, Refunds, Settings, navigation, forms, filters, dialogs, and recipient timeline.
- Kept the dashboard's dark analytics styling and colour-coded charts/statuses.
- Updated browser/PWA theme colours and service-worker cache version so deployed clients can fetch the new stylesheet.
- No application data model, localStorage key, or WhatsApp workflow logic was changed.

## Data and deployment safety
- Storage key remains `dealDhamakaAgentV2`.
- Keep the existing deployment untouched; use a separate branch or Vercel Preview first.
- On a different origin, browser localStorage is separate; export a JSON backup from the old app and import it into the preview if you need your existing records there.

## Validation
- Run `node --check` on each JavaScript file.
- Confirm every local script referenced by `index.html` exists.
- Inspect the CSS and manifest metadata.
- Live iPhone Safari testing and production deployment are not included in this package.
