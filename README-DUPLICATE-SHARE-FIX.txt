SEND ELIGIBILITY FIX

This patch keeps the existing app layout and localStorage key (dealDhamakaAgentV2).

What changed:
- Duplicate-share checks now use contact ID + product ID when available.
- For older history records missing IDs, checks fall back to normalized phone/name and product name.
- Selecting multiple products filters out recipients who have already received every selected product.
- Batch creation skips each already-shared contact/product pair, while still allowing the recipient to receive a different selected product they have not received before.
- Bulk WhatsApp follow-ups and other existing app files are retained.

After deploying, test with one contact who has received Product A but not Product B, and another who has received both. Select A and B: the first should be eligible only for B; the second should not be eligible for either. Verify with test records before production.


FOLLOW-UP FIX (multi-product eligibility)
- Duplicate-share detection now checks stable IDs and normalized fallback fields, including phone/WhatsApp and product name/brand. This handles imported records with stale or empty IDs.
- A recipient who has already received every selected product is excluded. A recipient who has received only some selected products remains selectable for the products they have not received; batch creation still skips the already-shared pairs.
- Test using two products and three contacts: (1) received neither -> eligible; (2) received only Product A -> eligible for Product B only; (3) received both -> excluded when A and B are selected.
