---
name: Railway environment scope
description: Non-obvious limits when inspecting this project's Railway deployment and database.
---

Railway's project-level variable query can omit variables that are scoped to a service. Inspect the API service scope before concluding that production email configuration is missing.

**Why:** The production API had the required email variables in its service scope even though a project-level query exposed only the database URL and Resend API key. The database URL also resolves to Railway's private hostname outside Railway's network.

**How to apply:** Use the Railway service ID and production environment ID when checking deployment variables. Treat deployment health, pre-deploy schema output, and API health checks as the available external verification unless a Railway public database endpoint is explicitly configured.