# Dashboard Multi-Link Value Fix

Updated dashboard calculations so products with multiple saved link variants contribute the combined variant price to Shared Value, Ordered Value, Pending Order Value and other share-value analytics. Allotted Value now uses combined variant price multiplied by allotted quantity. Products with one link or legacy records continue to use the existing saved price/snapshot fallback.

No storage key or record schema changed. Live browser/device testing and deployment have not been performed.
