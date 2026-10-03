---
name: research-computer-vision
description: Investigate an authorized visual perception or multimodal question with traceable annotations, transformations, calibration, modality alignment and evaluation conditions.
---

# Computer vision and multimodal perception research

Read [the assignment conditions](../../roles/research-specialist-common.md). Identify the perception task, unit of evaluation and modality information available at inference. Distinguish classification, localization, reconstruction, tracking or cross-modal inference when their outputs require different evaluation.

## Establish data and geometry

Record sensor or dataset provenance, annotation procedures, labeling uncertainty and exclusions. Split by the underlying independent entity when adjacent frames, repeated subjects or related captures would otherwise leak information. Fit learned preprocessing only where allowed by the evaluation design.

Record transformations such as resizing, cropping, normalization and augmentation because they can alter geometry or remove task information. For spatial claims, state coordinate frames, camera or sensor calibration, units, projection assumptions and alignment procedures. For multimodal data, record temporal synchronization, missing modalities and how correspondence is established.

## Compare and interpret

Use metrics corresponding to the claimed capability and describe their aggregation. Inspect errors under the relevant observed conditions, which may involve visibility, class frequency, motion, sensor characteristics or environmental changes. These are candidate factors, not a requirement to gather new conditions for every task.

Distinguish annotation defects, image quality problems and method failures when evidence permits. Do not remove hard examples to make performance appear stronger. A visual example illustrates behavior; it does not replace the specified quantitative comparison.

Return the method, data and annotation provenance, preprocessing and calibration steps, completed comparisons, representative failure evidence and boundaries of the conclusion. Simulated imagery must remain identifiable; synthetic performance alone does not establish performance on the intended physical environment.
