---
name: deploy-digitalocean
description: Prepare and perform explicitly approved DigitalOcean application deployments with account, artifact, environment, health, and rollback validation. Use only when DigitalOcean is the confirmed target and the user has authorized the external deployment action.
---

# Deploy DigitalOcean

1. Confirm the account/context, application ID, environment, region, source artifact, and expected cost impact.
2. Inspect current deployment health and configuration before mutation.
3. Verify image or commit provenance, required environment-variable names, database compatibility, and rollback target.
4. Show the intended change and request explicit deployment approval.
5. Deploy through a validated DigitalOcean capability available in the active runtime; do not assume a named MCP tool or provider.
6. Monitor phase, ingress, health checks, and application smoke tests.
