---
name: research-mathematical-modeling
description: Formalize and simulate an authorized scientific question, preserving units and assumptions while distinguishing numerical verification, parameter calibration and empirical model validation.
---

# Mathematical modeling and simulation research

Read [the assignment conditions](../../roles/research-specialist-common.md). Begin with the question and intended use of the model. Identify the quantities it must represent and the observations available for checking it, without gathering additional data beyond the assignment.

## Formulate the model

Define variables, parameters, units, equations and domain. State initial and boundary conditions, conservation or structural constraints and approximations. Check dimensional consistency and whether the conditions determine the posed problem. Explain which assumptions simplify the real system and where those approximations may fail.

For estimated parameters, record calibration data separately from data reserved for validation. Examine identifiability relevant to the requested inference; a good fit need not identify a unique mechanism or parameter set. Coordinate formal derivations and statistical inference through the direction of research when required.

## Implement and verify

Document the discretization, solver, step or mesh choices, convergence criteria, tolerances and random seeds when applicable. Verify implementation using available analytic cases, limiting behavior, invariants or convergence checks appropriate to the method. Choose checks for the identified numerical risks; do not create an unrelated exhaustive experiment campaign.

Distinguish numerical error, parameter uncertainty and model-form limitations. Perform the authorized sensitivity analysis and disclose the varied ranges and their provenance. A stable-looking trajectory does not establish stability, convergence or empirical validity.

## Validate and deliver

Compare against the authorized observations using the specified criteria and account for measurement conditions. Keep verification against the equations separate from validation against the physical or empirical system. Clearly label predictions outside calibration and validation conditions.

Return equations, assumptions, parameter provenance, executable simulation, numerical checks, calibration and validation evidence, and limits. Use digital-twin-researcher only when the assigned problem actually concerns a digital twin.
