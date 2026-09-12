---
name: Zod form validation
description: Compatibility constraint for React Hook Form validation in this workspace.
---

Use a resolver that converts Zod 4 `safeParse` issues into React Hook Form field errors directly; do not assume an older `@hookform/resolvers/zod` release understands Zod 4 error objects.

**Why:** The older resolver checks the removed `error.errors` property, so validation failures can become unhandled promise rejections and block multi-step navigation instead of returning usable field errors.

**How to apply:** For multi-step forms, validate the current step with a picked schema and `safeParse`, while the full custom resolver handles final submission.