# Authorization for scientific programs

Use this procedure when a bundled scientific program reads study materials, writes outputs, or sends a request. The file documents the authorization already given by Roberto; neither its creation nor its editing grants permission. Refer to the actual assignment, preserve its sources and methods, and ask only for a material decision not covered by that authorization. Do not turn optional request or spending limits into mandatory budgets for every activity.

The coordinator creates an absolute-path JSON file outside version control and records the same authorization reference in the research session. Do not put credentials or participants' responses in it. Set `AGENT_FORGE_RESEARCH_AUTHORIZATION` only for the program's process by invoking:

```text
node <plugin-root>/scripts/run-research-python.mjs --authorization <absolute-policy.json> --script skills/<skill>/scripts/<program>.py -- <program-arguments>
```

The launcher validates the installed package and uses its recorded Python interpreter. The helpers fail before a sensitive operation when the corresponding scope is absent. They do not raise the sandbox's permissions or cover arbitrary unwrapped code.

Example structure (replace every example value from the authorized assignment):

```json
{
  "version": 1,
  "authorizationReference": "User instruction identifying the authorized activity",
  "purpose": "Retrieve public metadata for the references assigned by the user",
  "readRoots": ["D:/authorized-study", "C:/installed-plugin-root"],
  "writeRoots": ["D:/authorized-study/derived"],
  "allowOverwrite": false,
  "maxReadBytes": 52428800,
  "maxWriteBytes": 52428800,
  "credentials": {
    "allowedEnvironmentVariables": [],
    "files": []
  },
  "network": {
    "rules": [{
      "origin": "https://api.crossref.org",
      "methods": ["GET"],
      "pathPrefixes": ["/works/"],
      "credentialNames": [],
      "allowPrivateAddresses": false
    }],
    "maxResponseBytes": 2097152,
    "maxRequestBytes": 2097152
  }
}
```

The domains above are examples, not a universal list. Add only the destinations and operations covered by the assignment, including required metadata redirects. Public services can be used anonymously. Credentials are optional unless the particular service requires them. Credential names must be allowed explicitly; an explicitly named environment file must also appear in `credentials.files`. The code does not search parent directories. Credentials in URL parameters additionally require `allowCredentialQuery: true` on that destination rule. Headers cannot forward a credential to a different destination without its own authorization.

For model calls, the matching network rule must declare `models` containing the exact external model identifiers authorized for that operation. The agent's reasoning model is a separate setting. OpenRouter generation takes explicit image and review model identifiers; it preserves the real generator and review behavior.

If Roberto set a request limit, record `network.maxRequests`. If he set a monetary limit, record `network.maxCost` and `network.currency`. The program must supply `estimated_cost` as a conservative maximum reservation per request, or the generator's corresponding CLI argument. This is a reservation, not measured provider billing. If a defensible maximum is unavailable, do not claim a hard cost cap; use a provider-enforced limit or obtain the missing decision before the paid operation. Usage is recorded in adjacent `.usage.json` and lock files without request payloads or secrets. Reservations persist after timeouts because a remote operation may already have been billed. Do not delete usage files to reset an existing limit.

All resolved reads must remain inside existing read roots, including symbolic links. Outputs use authorized write roots and reject replacement unless `allowOverwrite` was explicitly granted. Preserve original data and write derived files separately. Explicit authorization is also needed for contacting participants, publishing results, changing preserved data or operating physical hardware; this policy example does not grant any of those actions.

These controls validate paths, destinations, models and declared limits. They do not establish scientific validity, consent authenticity, rights to data, or correctness of an agent's interpretation of an instruction. The coordinator remains responsible for relating the recorded scope to the user's actual request.
