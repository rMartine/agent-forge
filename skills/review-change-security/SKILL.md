---
name: review-change-security
description: Review a scoped change for exploitable security, privacy, authorization, secret, dependency, data, and operational risks. Use before release, for sensitive architecture, or when code crosses trust boundaries or can perform external mutations.
---

# Review Change Security

1. Define assets, trust boundaries, attacker capabilities, and changed attack surface.
2. Inspect the diff and relevant configuration, authentication, authorization, validation, storage, logging, and dependency evidence.
3. Run approved read-only scanners when available.
4. Prioritize findings by exploitability and impact, with exact file evidence.
5. Do not modify product code unless explicitly asked; return remediation criteria to the implementation owner.
6. Require explicit approval for destructive, privileged, production, or control-system actions.
7. State residual risk and release recommendation.
