# Next.js 15, React 19, and Tailwind CSS 4

Use this guide only for the assigned implementation in a repository whose manifests and lockfile confirm this stack. Skillara is the recorded example, not a default stack for every product. Read the current component library, routes, styles, tests, and installed package types before editing. A repository with another version needs its matching documentation.

## Rendering and data boundaries

Keep server-only data, secrets, and authorization in server code. A Client Component is needed for state, event handlers, browser APIs, or client hooks; place that boundary where the feature needs it rather than moving an entire page to the browser. Pass serializable data across the boundary and preserve the existing application state model. Use the installed React 19 APIs and existing conventions, without changing the compiler or architecture as a side effect. See [Next.js 15 Server and Client Components](https://nextjs.org/docs/15/app/getting-started/server-and-client-components).

Inspect async request APIs such as params, searchParams, cookies, and headers against Next.js 15 types. Keep middleware.ts for the established Next.js 15 project; the proxy.ts convention in Next.js 16 is not a reason to rename it. Do not run a migration codemod, enable experimental cache components, or copy new cache directives from newer documentation during a feature task. The [Next.js 15 upgrade reference](https://nextjs.org/docs/15/app/guides/upgrading/version-15) explains version-specific behavior, not an instruction to upgrade.

For each changed mutation, validate input and authorize the action on the server, then update only the relevant data and UI states. Handle loading, validation, empty, rejected, and successful states according to the contract. Understand existing cache/revalidation behavior before changing it; do not cache user-specific data across identities. Preserve error boundaries and the framework's redirect/not-found control flow.

## Style and identity

Use the project's Tailwind CSS 4 entry point, theme variables, component tokens, and installed plugins. Do not add a Tailwind 3 configuration or migration purely because a sample includes it. The [Tailwind CSS 4 documentation](https://tailwindcss.com/docs/theme) describes theme variables; inspect the installed version for exact syntax.

Keep existing brand, typography, navigation, content, and accessible components unless the task calls for changing them. Design guides influence choices within these constraints. Commercial-page guidance applies only to a commercial page; operational screens prioritize task completion and state clarity. Motion and libraries are optional implementation choices, not conditions for quality.

## Verification

Run the repository's applicable type checks, tests, and build. Exercise the changed route in a browser, including relevant direct navigation, reload, form submission, error state, keyboard path, and responsive layout. Confirm private data and secrets do not enter client output. An HTML snapshot or generated image alone does not prove the route works. Return command results, observed interaction, and missing browser evidence explicitly.
