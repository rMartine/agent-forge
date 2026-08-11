# Optional PostgreSQL Knowledge Service

Confirm the service is already healthy before connecting. Default development values are host `localhost`, port `5433`, database `knowledge`, and table `entries`; prefer values documented by the current repository.

Use parameterized, read-only queries. Search title, description, tags, affected domains, and prevention guidance. Do not expose credentials or return private payload fields. If the schema or service differs, stop and report the mismatch.
