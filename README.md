# Deal Dhamaka Agent — Fresh Version

A mobile-friendly, installable web app for managing contacts and products, opening personalized WhatsApp messages, and tracking share attempts by brand, product type, product, recipient, and date.

## Files
- `index.html` — app layout
- `styles.css` — mobile-first styling
- `app.js` — local data, contacts/products, CSV import, batch WhatsApp sharing, tracking and exports
- `manifest.json` and `sw.js` — PWA metadata and offline cache

## Run locally
Open `index.html` in a modern browser. For PWA/service-worker testing, serve this folder through a local HTTP server or deploy it to a static host such as Vercel.

## CSV headers
Contacts: `name,phone,category` (phone should include country code, e.g. 919876543210).
Products: `name,brand,productType,description,price,platform,link`.

## Tracking meaning
A record is saved synchronously when the app opens the corresponding WhatsApp link. This means **share initiated / WhatsApp opened**, not confirmed sent, delivered, or read. The user must still tap Send inside WhatsApp. Data is local to the browser/device; export JSON backups regularly. This version starts with a new storage key and does not overwrite the old app's local data.
