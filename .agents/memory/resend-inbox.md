---
name: Resend inbox delivery
description: Durable constraints for inbound Resend email handling and production cutover.
---

Inbound Resend webhooks must be verified against the exact raw request body before parsing or retrieving the message. Process each Resend email ID idempotently, then retrieve the full message and persist it before attempting admin notification.

**Why:** Resend retries webhook deliveries, and parsing or transforming the payload before verification breaks signature checks; saving first prevents lost inbound mail when notification delivery fails.

**How to apply:** Keep the webhook route isolated from the normal JSON parser, use the Resend signature headers, deduplicate on the provider email ID, and treat notification failure as non-fatal after persistence.