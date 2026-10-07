# PostgreSQL 16, Drizzle 0.45, BullMQ 5, and Valkey

Read the installed versions, SQL migrations, schema definitions, connection management, queues, worker lifecycle, and deployment configuration before editing. These technologies may be present independently. Do not add a queue or database merely because this reference includes it.

## Database changes

Preserve the existing PostgreSQL driver and pool. A guide using Neon HTTP does not authorize replacing a conventional PostgreSQL connection. With Drizzle 0.45, use the repository's supported relations and query APIs; do not copy a newer defineRelations/RQB-v2 example into an older version or migrate implicitly. Confirm APIs against installed types and matching source.

Use database constraints for integrity and parameterized queries for untrusted values. Authorization and tenant filters belong in the actual data path. When operations must succeed together, use the transaction's handle throughout; do not accidentally issue a query through the outer db object. The [Drizzle transaction reference](https://orm.drizzle.team/docs/transactions) documents this distinction. Choose isolation and retry behavior for the real invariant, not as a universal setting.

Prepare migrations as reviewable files. Verify them against a disposable PostgreSQL 16 database where applicable, including existing rows, constraints, transaction behavior, and recovery. A SQLite substitute cannot prove PostgreSQL-specific behavior. Applying migrations to preserved or remote data retains the task's authorization requirements. Performance changes and indexes need the assigned requirement or an observed problem; do not perform unsolicited tuning.

## Background work

Inspect each producer, worker, connection, job schema, retry policy, and side effect. BullMQ jobs can be retried: make the business operation idempotent where required, and distinguish attempt failure from permanent failure. A transaction committing data before enqueueing a job can leave a delivery gap; use the established design and resolve that invariant explicitly if the task affects it.

BullMQ's [connection guidance](https://docs.bullmq.io/guide/connections) distinguishes interactive producers from workers. Do not give an HTTP producer unbounded waiting just because worker connections need a different retry policy. Use the installed BullMQ 5 APIs and close owned workers/connections during shutdown with the project's timeout and recovery behavior.

Treat Valkey as the configured service, not automatic proof of every Redis command/version assumption. Check the actual image/version, persistence, eviction policy, supported commands, and BullMQ compatibility. Never use FLUSHALL, delete queues, drain unrelated work, or change eviction globally to prepare a test. Use a scoped test queue or disposable instance and clean up only resources the test owns.

## Verification

Demonstrate the changed invariant: duplicate submission, retry, failure before/after the side effect, concurrent requests, and shutdown/restart when relevant. Record the real database/service versions and whether checks ran against them or mocks. Mocks prove calling behavior; they do not establish transaction isolation, SQL syntax, persistence, or queue recovery. Include the migration/job identifier and reversible recovery steps without exposing live data.
