# Deal Dhamaka Agent V2 — Standardized Six-Section Edition

This edition reorganizes the existing application into six main navigation destinations while preserving the existing local-first data model and feature modules.

## Main navigation
1. **Home** — existing dashboard and quick actions.
2. **Contacts** — contact directory, contact details, Excel export, and contact-level history features.
3. **Products** — existing product and brand catalogue, including multiple product links.
4. **Share** — existing WhatsApp distribution workflow and message preview.
5. **Finance** — payment import, payment queue, campaign support charges, receipts, and Refunds as an internal section.
6. **More** — History, Tracking, Recipient activity, and Settings as internal sections.

## Changes made
- Reduced the visible bottom navigation from nine destinations to six.
- Grouped Payments and Refunds under Finance.
- Grouped History, Tracking, Recipient activity, and Settings under More.
- Added compact internal section navigation to the grouped pages.
- Updated the visual system to premium dark navy with restrained gold accents.
- Removed the dynamically injected extra Recipients bottom-navigation button; Recipient activity remains available under More.
- Removed a duplicate Payments render invocation in page navigation.
- Updated the service-worker cache version so browsers fetch the revised navigation and theme.

## Data and compatibility safeguards
- Kept `dealDhamakaAgentV2` unchanged.
- Kept `dealDhamakaWhatsAppTemplatesV1` unchanged.
- Kept the existing app data shape and record IDs unchanged.
- Kept `supabase-config.js`, `cloud-setup.js`, the Supabase SDK integration, and all existing `dd_*` table mappings unchanged.
- Kept payment, consolidated receipt, campaign charge, refund, contact export, multi-link, manual WhatsApp, and tracking modules.
- No data migration or deletion is performed by this UI refactor.

## Deployment
Replace the repository contents with the contents of `Deal-Dhamaka-Agent-V2-main`, commit, and deploy. After deployment, reload the app. If the installed PWA still shows the old navigation, close and reopen it once so the new service-worker cache version is installed.

## Validation
All JavaScript files passed `node --check`; ZIP integrity was checked after packaging. This is a source-level validation only; no live Supabase account, payment flow, WhatsApp handoff, or two-device sync was executed as part of this UI reorganization.
