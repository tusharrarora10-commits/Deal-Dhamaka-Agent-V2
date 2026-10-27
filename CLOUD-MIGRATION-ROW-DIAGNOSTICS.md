# Cloud migration row diagnostics

This build adds sanitized context when a migration upsert fails: table name, 1-based local record index, record ID, serialized payload size, and payload field names. It deliberately does not print contact names, phone numbers, product descriptions, message text, or other payload values.

Do not retry migration until you have a fresh local backup. If it fails, capture the full alert/status message. A failure may happen after earlier rows have already been inserted, so check cloud counts before retrying; the migration stops if the cloud is no longer empty.

This patch has not been live-tested against Supabase. It is diagnostic only and does not change schema, policies, local storage keys, or deletion behavior.
