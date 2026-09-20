---
name: Resend webhook state
description: External Resend and DNS setup facts that affect inbound email cutover.
---

The Resend account already has an enabled webhook pointed at the production route `https://flexirouteglobal.com/api/emails/webhook` with `email.received` enabled. An older enabled webhook points at the domain root; treat it as a duplicate and require confirmation before deleting it.

**Why:** The application deduplicates received Resend IDs, but duplicate webhook delivery can still complicate troubleshooting and should not be cleaned up destructively without approval.

**How to apply:** Before creating or deleting Resend webhooks, list the account's existing endpoints and keep the production route. The domain currently publishes Cloudflare MX records, so inbound mail will not reach Resend until the exact Resend receiving records are applied.