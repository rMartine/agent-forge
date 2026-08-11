# Core Lifecycle Requirements

## Validate

`validateRoster()` checks manifest v2, 24 unique identities, exactly nine entries, explicit depth-one delegation, handoff references, skill structure, instruction `applyTo`, duplicate discoverable definitions, and unsafe self-modification language. Error diagnostics block deployment.

## Discover and resolve

`discoverVsCodeEnvironment()` verifies VS Code 1.104+, resolves user targets, and accepts exact available tool and model inventories. Capability and model policy resolution operates on deployed copies only. Required missing tools produce `AF004`; unavailable configured models inherit unless a required model policy is introduced.

## Preview

`createDeploymentPlan()` renders all artifacts and hashes the exact bytes that would be installed. Preview is immutable and performs no user-profile mutation. The same plan contract is consumed by deployment.

## Deploy

`applyDeploymentPlan()` refuses errors and unmanaged collisions, writes temporary sibling files, uses atomic replacement, backs up only replaced managed targets, and records source/deployed hashes in `~/.agent-forge/state.json`. A failed transaction restores every file touched by that transaction.

## Status

`getDeploymentStatus()` compares current target hashes with the active ownership ledger and reports `synced`, `out-of-sync`, or `not-deployed`.

## Rollback

`rollbackDeployment()` restores the selected recorded deployment's prior managed state. Modified or missing current files are preserved and diagnosed. Rollback never reads arbitrary content from Git `HEAD`.

## Wipe

`removeManagedDeployment()` removes or restores only files whose current hashes still match the active ledger. Modified and unmanaged files survive. CLI wipe requires `--managed-only` and the exact active deployment ID.

## Approval boundaries

Production, cloud, release, push, provider installation, rollback, and wipe operations require explicit user confirmation. No auto-confirm setting or flag exists.
