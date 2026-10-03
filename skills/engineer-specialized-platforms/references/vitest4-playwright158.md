# Vitest 4 and Playwright 1.58

Use the repository's actual runner versions, package manager, scripts, browser setup, and verification requirements. These versions are the recorded product baseline, not an instruction to upgrade other products. Check package files and lockfile first. Preserve startup, integration, and release requirements separately from the checks of a small change.

## Vitest

Test the changed behavior and failure boundary. Use real domain/handler code with controlled dependencies, not a restatement of implementation details. Restore shared state, timers, mocks, and environment values between cases. Understand the runner's mock lifecycle instead of treating reset, clear, and restore as interchangeable. Vitest 4 has specific changes documented in its [migration reference](https://vitest.dev/guide/migration/); read installed types for the exact API.

For time-based behavior, advance and restore fake timers deliberately. For async behavior, await the result and assert the observable outcome. A test that only checks a mocked function was called may not prove data was persisted or an operation was authorized. Do not add snapshots whose expected content is copied mechanically from the current output without checking the requirement.

## Playwright

Run the project's existing Playwright runner for browser tests. The separate playwright-cli is only an optional interaction tool; its presence and command support must be checked independently. Do not infer CLI availability from the test runner's --version or install either globally. Use stable role/label/test-id locators and web-first assertions; wait for the relevant UI state rather than arbitrary delays. The [official best practices](https://playwright.dev/docs/best-practices) explain isolation and observable assertions.

Use a scoped browser context, test identity, and disposable data. Preserve personal browser profiles and unrelated sessions. Exercise the complete changed flow and inspect consequential network/data results where needed. Do not rewrite expected behavior to match a failure or treat a screenshot's existence as visual approval.

## Return actual evidence

List command, scope, exit status, relevant result, and environment. Distinguish passed, failed, skipped, and blocked. Distinguish static fixtures and expected assertions from agent behavior observed in Desktop or VS Code. A browser emulating a phone cannot establish native gesture/haptic behavior. Repeat a check when edits, failures, or unresolved concerns justify it, while completing all applicable integration/release checks.
