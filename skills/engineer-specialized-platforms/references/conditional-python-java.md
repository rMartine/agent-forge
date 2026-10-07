# Conditional Python and Java services

Activate only when the assigned product service uses the relevant stack. A reference to Sourceweave does not by itself establish that its source, runtime, data, or deployment is present. Inspect its current repository and explicit assignment before selecting the procedure. Do not route the recorded TypeScript products through these languages by default.

## Python and FastAPI

Read pyproject/requirements/lockfiles, Python and Pydantic versions, routers, dependencies, database sessions, and tests. Keep the existing package manager and tools. Match [FastAPI documentation](https://fastapi.tiangolo.com/) to the installed version; recent app.frontend, native telemetry, or streaming APIs may not exist in the project.

Validate request/response boundaries with the installed Pydantic API. Keep authorization explicit and dependencies scoped correctly. Avoid blocking the event loop with synchronous I/O in async handlers. Dispose resources through the established lifespan/dependency pattern. Do not impose uv, SQLModel, Ruff, or a new authentication library solely because an external skill recommends them.

Test real routing/dependency execution for the changed behavior, including invalid input, unauthorized access, and resource cleanup. Label mocks versus actual database/service integration. Publishing a server remains subject to the assigned deployment scope.

## Java and Apache Jena

Read Maven/Gradle configuration, Java version, Jena modules, dataset storage, transaction boundaries, query construction, and tests. Use [Apache Jena documentation](https://jena.apache.org/documentation/) for the installed modules and version. Treat RDF graph semantics, SPARQL queries, inference rules, and scientific interpretations as distinct concerns.

Use parameterized query construction for untrusted values, bounded queries, and correct dataset transaction lifetimes. Close owned query executions and resources. Preserve graph names, ontology versions, data provenance, and import behavior required by the project. Do not change an ontology, inference method, research dataset, or scientific evaluation criterion under an ordinary engineering assignment.

Use isolated RDF fixtures with explicit expected triples/query results for the changed behavior. A synthetic graph demonstrates only that scenario; it does not establish correctness of a scientific model or performance on real data. Report version, fixture provenance, query/result, and remaining service or data checks.
