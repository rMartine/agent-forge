---
name: scientific-critical-thinking
description: Evaluates scientific claims and evidence quality. Applies to experimental design validity, biases and confounders, statistical interpretation, evidence grading frameworks (GRADE, Cochrane Risk of Bias), and teaching critical analysis. Supports evidence appraisal and identifying flaws; formal peer review writing belongs to peer-review.
allowed-tools: Read Write Edit
license: MIT license
metadata:
  compatibility: Analytical guidance needs no network. Optional figures via the scientific-schematics skill require OPENROUTER_API_KEY and outbound API access to OpenRouter.
  version: "1.5"
  last-reviewed: "2026-10-01"
  skill-author: K-Dense Inc.
---

## Agent Forge authorization and responsibility

This locally adapted skill supports only the research question, sources, data, methods, outputs, and effort authorized by Roberto. Reuse current decisions. Do not install other skills, expand the literature corpus, run new experiments, upload material, or start a paid service merely because an upstream example recommends it. The user retains scientific decisions not expressly delegated. Apply upstream examples only when relevant to the requested deliverable.

Use the user's requested deliverable language. Preserve evidence, uncertainty, negative results, and attribution; do not invent data or citations. Do not abbreviate responsibilities, decisions, or conditions into invented labels. Technical abbreviations retain only their conventional meanings. Published methodological guidance does not authorize changing study design or compressing requirements.

Scripts require AGENT_FORGE_RESEARCH_AUTHORIZATION to identify a reviewed task authorization file. Inputs and outputs must be inside its permitted roots. Network origins, methods, paths, models, credentials, any request limits, and any monetary ceiling must match the user authorization. Do not change that authorization file to make an operation pass. A command-line option does not grant permission to overwrite a file or use credentials. Never search parent folders for .env files. Installation and subsequent upstream updates are separate actions.

Run only the checks relevant to the changed material and the agreed delivery stage. A diagnostic is evidence of what it checks, not proof of scientific validity, live provider access, or manuscript acceptance. Follow the existing authorizations without inventing repeated approval steps. Recommendations to use a separate skill are optional routing suggestions, never permission to install it. Prefer the installed native document, figure, and browser capabilities when they fit the authorized task.


# Scientific Critical Thinking

## Overview

Critical thinking is a systematic process for evaluating scientific rigor. Assess methodology, experimental design, statistical validity, biases, confounding, and evidence quality using GRADE and Cochrane ROB frameworks. Apply this skill for critical analysis of scientific claims.

## When to Use This Skill

This skill should be used when:
- Evaluating research methodology and experimental design
- Assessing statistical validity and evidence quality
- Identifying biases and confounding in studies
- Reviewing scientific claims and conclusions
- Conducting systematic reviews or meta-analyses
- Applying GRADE or Cochrane risk of bias assessments
- Providing critical analysis of research papers

## Appraisal Workflow

1. **Fix the question and unit.** Record population, intervention/exposure, comparator,
   outcome, time point, effect measure, and target setting. Distinguish descriptive,
   predictive, and causal claims. Identify the independent experimental/sampling unit.
2. **Extract evidence before judging.** Locate the numerical result, uncertainty,
   denominators, protocol/registration, analysis plan, and relevant supplementary material.
   Keep missing reporting separate from evidence that a procedure was not performed.
3. **Assess design and analysis.** Check selection, confounding, measurement, attrition,
   multiplicity, dependence, and model assumptions. Good fit or optimizer convergence does
   not establish a uniquely identified parameter or a causal effect.
4. **Choose the right appraisal framework.** Reporting completeness, risk of bias, and
   certainty of a body of evidence answer different questions. Record the exact tool
   version and the result being assessed; do not turn checklist counts into a quality score.
5. **Synthesize with scope intact.** Examine independent replication, overlapping samples,
   missing evidence, and applicability. Apply GRADE per outcome/comparison when appropriate,
   with explicit domain reasons, rather than grading a whole paper by its design label.
6. **Write a traceable critique.** For each concern give the source location, observation,
   consequence for the claim, uncertainty, and a feasible remedy. Separate supported
   conclusions from assumptions and from clinical/policy recommendations.

Current framework versions, primary sources, and verification limits are in
[references/review_sources.md](references/review_sources.md). The examples in the references
are teaching examples, not empirical findings or validated patient-specific advice.

## Visual Aids (Optional)

Only add figures when the **user explicitly requests** a diagram (for example, a GRADE flowchart, bias decision tree, or evidence-quality framework).

**When figures help:**
- Critical thinking framework diagrams
- Bias identification decision trees
- Evidence quality assessment flowcharts
- GRADE or risk-of-bias evaluation frameworks

**How to create figures:**
- **Preferred:** Use the **scientific-schematics** skill for AI-generated diagrams from a natural-language description
- **Alternative:** Build figures in your usual tools (draw.io, PowerPoint, matplotlib, etc.)

Run from the repository root, with `OPENROUTER_API_KEY` set:

```bash
python skills/scientific-schematics/scripts/generate_schematic.py "Illustrative GRADE appraisal: define outcome and comparison, assess certainty domains with reasons; keep recommendation decisions separate" -o figures/grade_flowchart.png --doc-type report
```

This optional command's CLI was checked with `--help`; paid generation was not exercised
for this example. Follow that skill's current dependencies and review every generated label.

**Disclosure:** AI schematic generation sends your prompt to [OpenRouter](https://openrouter.ai/) (a third-party API). Do not include unpublished sensitive details unless that transmission is appropriate for your project.

---

## Core Capabilities

Seven capability areas, each with the questions to ask and what the answers imply, are in
[references/core_capabilities.md](references/core_capabilities.md):

1. **Methodology critique** — design, controls, confounding, and whether the method can
   answer the question asked.
2. **Bias detection** — selection, measurement, publication, and cognitive biases.
3. **Statistical analysis evaluation** — power, multiplicity, p-value misuse, effect sizes.
4. **Evidence quality assessment** — study hierarchy, replication, and strength of inference.
5. **Logical fallacy identification** — the fallacies that recur in scientific argument.
6. **Research design guidance** — how to strengthen a design before data collection.
7. **Claim evaluation** — separating what was shown from what is being asserted.

Per-topic detail is in [references/scientific_method.md](references/scientific_method.md),
[references/common_biases.md](references/common_biases.md),
[references/statistical_pitfalls.md](references/statistical_pitfalls.md),
[references/evidence_hierarchy.md](references/evidence_hierarchy.md),
[references/logical_fallacies.md](references/logical_fallacies.md), and
[references/experimental_design.md](references/experimental_design.md).

## Application Guidelines

### General Approach

1. **Be Constructive**
   - Identify strengths as well as weaknesses
   - Suggest improvements rather than just criticizing
   - Distinguish between fatal flaws and minor limitations
   - Recognize that all research has limitations

2. **Be Specific**
   - Point to specific instances (e.g., "Table 2 shows..." or "In the Methods section...")
   - Quote problematic statements
   - Provide concrete examples of issues
   - Reference specific principles or standards violated

3. **Be Proportionate**
   - Match criticism severity to issue importance
   - Distinguish between major threats to validity and minor concerns
   - Consider whether issues affect primary conclusions
   - Acknowledge uncertainty in your own assessments

4. **Apply Consistent Standards**
   - Use same criteria across all studies
   - Don't apply stricter standards to findings you dislike
   - Acknowledge your own potential biases
   - Base judgments on methodology, not results

5. **Consider Context**
   - Acknowledge practical and ethical constraints
   - Consider field-specific norms for effect sizes and methods
   - Recognize exploratory vs. confirmatory contexts
   - Account for resource limitations in evaluating studies

### Apply risk-of-bias tools to the right unit

For RoB 2, identify the specific result: outcome, time point, intervention comparison, numerical estimate, and effect of assignment versus adherence. Use the variant for individually randomized, cluster, or crossover trials; record signalling answers and justifications rather than assigning one blanket score to the whole paper. Different outcomes in the same trial can have different bias judgments. See the [Cochrane RoB 2 guidance](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-08).

For non-randomized intervention effects, state whether using ROBINS-I 2016 or the
ROBINS-I V2 November 2025 **draft** for follow-up/cohort studies. Do not mix their domains
or algorithms. Diagnostic accuracy appraisal now uses QUADAS-3 (current tool v1.2), at
the accuracy-estimate level. See the tool-specific sources before a formal assessment.

### When Providing Critique

**Structure feedback as:**

1. **Summary:** Brief overview of what was evaluated
2. **Strengths:** What was done well (important for credibility and learning)
3. **Concerns:** Issues organized by severity
   - Critical issues (threaten validity of main conclusions)
   - Important issues (affect interpretation but not fatally)
   - Minor issues (worth noting but don't change conclusions)
4. **Specific Recommendations:** Actionable suggestions for improvement
5. **Overall Assessment:** Balanced conclusion about evidence quality and what can be concluded

**Use precise terminology:**
- Name specific biases, fallacies, and methodological issues
- Reference established standards and guidelines
- Cite principles from scientific methodology
- Use technical terms accurately

### When Uncertain

- **Acknowledge uncertainty:** "This could be X or Y; additional information needed is Z"
- **Ask clarifying questions:** "Was [methodological detail] done? This affects interpretation."
- **Provide conditional assessments:** "If X was done, then Y follows; if not, then Z is concern"
- **Note what additional information would resolve uncertainty**

## Reference Materials

This skill includes comprehensive reference materials that provide detailed frameworks for critical evaluation:

- **`references/scientific_method.md`** - Core principles of scientific methodology, the scientific process, critical evaluation criteria, red flags in scientific claims, causal inference standards, peer review, and open science principles

- **`references/common_biases.md`** - Comprehensive taxonomy of cognitive, experimental, methodological, statistical, and analysis biases with detection and mitigation strategies

- **`references/statistical_pitfalls.md`** - Common statistical errors and misinterpretations including p-value misunderstandings, multiple comparisons problems, sample size issues, effect size mistakes, correlation/causation confusion, regression pitfalls, and meta-analysis issues

- **`references/evidence_hierarchy.md`** - Traditional evidence hierarchy, GRADE system, study quality assessment criteria, domain-specific considerations, evidence synthesis principles, and practical decision frameworks

- **`references/logical_fallacies.md`** - Logical fallacies common in scientific discourse organized by type (causation, generalization, authority, relevance, structure, statistical) with examples and detection strategies

- **`references/experimental_design.md`** - Comprehensive experimental design checklist covering research questions, hypotheses, study design selection, variables, sampling, blinding, randomization, control groups, procedures, measurement, bias minimization, data management, statistical planning, ethical considerations, validity threats, and reporting standards

**When to consult references:**
- Load references into context when detailed frameworks are needed
- Search references for specific topics with your available text-search tool.
- References provide depth; SKILL.md provides procedural guidance
- Consult references for comprehensive lists, detailed criteria, and specific examples

## Remember

**Scientific critical thinking is about:**
- Systematic evaluation using established principles
- Constructive critique that improves science
- Proportional confidence to evidence strength
- Transparency about uncertainty and limitations
- Consistent application of standards
- Recognition that all research has limitations
- Balance between skepticism and openness to evidence

**Always distinguish between:**
- Data (what was observed) and interpretation (what it means)
- Correlation and causation
- Statistical significance and practical importance
- Exploratory and confirmatory findings
- What is known and what is uncertain
- Evidence against a claim and evidence for the null

**Goals of critical thinking:**
1. Identify strengths and weaknesses accurately
2. Determine what conclusions are supported
3. Recognize limitations and uncertainties
4. Suggest improvements for future work
5. Advance scientific understanding

## Upstream attribution

This skill was adapted from Scientific Agent Skills by K-Dense. Software attribution and the original license are preserved in the plugin's provenance records. Do not automatically add the authors' paper to a research bibliography or fetch it merely because this skill was used. Propose a scholarly citation only when it is relevant to the authorized work and supported by a verified source.
