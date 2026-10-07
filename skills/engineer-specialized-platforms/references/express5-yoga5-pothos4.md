# Express 5, GraphQL Yoga 5, and Pothos 4

Apply only to the assigned service when its package files and lockfile confirm the stack. Read entry points, middleware order, schema construction, request context, authentication, data access, error handling, and relevant tests. Preserve the project's REST/GraphQL boundaries and naming conventions; the presence of Express does not authorize replacing it with another server.

## HTTP boundary

Express 5 forwards rejected promises from async handlers to error middleware. Maintain a final four-argument error handler and avoid duplicate responses after headers have been sent. Set body parsers and limits where the route needs them; do not blindly place a JSON parser in front of an integration that owns its request body. Review actual route patterns against the [Express 5 migration reference](https://expressjs.com/en/guide/migrating-5/), especially changed wildcard/optional syntax, without running a codemod unless migration is assigned.

Keep existing authentication, CORS, CSRF, request limits, and proxy settings aligned with deployment. Do not treat CORS as authorization or trust forwarded client headers without the configured proxy boundary. Log useful request/error context without credentials or personal payloads.

## GraphQL and request isolation

Follow [Yoga's Express integration](https://the-guild.dev/graphql/yoga-server/docs/integrations/integration-with-express) using the installed Yoga 5 APIs. Preserve the existing endpoint and request/response integration. Yoga can accept the GraphQLSchema produced by Pothos; do not convert a code-first schema to SDL simply because a guide starts with createSchema.

Create typed context per request with the verified identity and authorized service access. Pothos [context guidance](https://pothos-graphql.dev/docs/guide/context) supports request-specific information. Never retain one user's identity in a global context or share a request loader cache across users. Validate input at the boundary and enforce authorization in the appropriate resolver/domain layer, including access to the requested object and tenant.

Mask unexpected internal errors. Return intentional public errors with stable semantics and no secret details. Bound list queries, pagination, and expensive operations according to actual requirements. Introduce caching, batching, persisted operations, uploads, or subscriptions only when required; each changes authorization and resource considerations.

## Verification

Test the changed contract with real handler/schema execution: successful request, malformed input, unauthenticated/unauthorized request, missing object, and dependency failure where applicable. Verify identity isolation across two requests and unchanged behavior of adjacent routes. For mutations test the resulting data and error rollback, not only an HTTP status. Use disposable local fixtures; external service access remains limited to the authorized environment. Return concrete command outputs and unresolved integration limits.
