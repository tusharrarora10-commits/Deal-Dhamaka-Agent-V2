SEND ELIGIBILITY FIX

This patch keeps the existing app layout and localStorage key (dealDhamakaAgentV2).

What changed:
- Duplicate-share checks now use contact ID + product ID when available.
- For older history records missing IDs, checks fall back to normalized phone/name and product name.
- Selecting multiple products filters out recipients who have already received every selected product.
- Batch creation skips each already-shared contact/product pair, while still allowing the recipient to receive a different selected product they have not received before.
- Bulk WhatsApp follow-ups and other existing app files are retained.

After deploying, test with one contact who has received Product A but not Product B, and another who has received both. Select A and B: the first should be eligible only for B; the second should not be eligible for either. Verify with test records before production.
