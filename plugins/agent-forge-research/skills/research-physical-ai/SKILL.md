---
name: research-physical-ai
description: Investigate authorized learning, perception and decision methods connected to physical action, including world models and simulation-to-reality transfer, without implying permission for actuation.
---

# Artificial intelligence for physical systems research

Read [the assignment conditions](../../roles/research-specialist-common.md). State the physical task, embodiment, environment, observation and action spaces, objective and operating conditions. Identify whether the assignment concerns a learned representation, world model, policy, planning method or evaluation of a combined system.

## Formalize the learned system

Separate what the method observes from what the simulator exposes and what would be available on real hardware. Record temporal assumptions, delays, state uncertainty, action limits and the consequences of acting on an incorrect estimate. Identify whether rewards, demonstrations or labels encode assumptions that affect the intended behavior.

Describe which components are learned and which are fixed models or controllers. Coordinate robotic system details with the robotics specialist and numerical model questions with the modeling specialist through the direction of research. Load the available digital-twin-researcher skill only if the actual assignment concerns a digital twin.

## Examine transfer and evidence

For simulation work, document physics, sensing, contacts, disturbances and initial-condition assumptions relevant to the question. Identify differences between simulation and the target environment; domain variation in simulation is not evidence that the actual differences have been covered.

Compare the authorized methods under comparable task conditions, and record unsuccessful episodes as well as successes. Separate task completion, constraint violations, intervention and recovery when those were observed. Do not interpret a reward increase as proof of physical suitability.

Return assumptions, the method and learning objective, simulation or hardware experiment conditions, executed evidence, failure cases and uncertainty. Simulated success does not authorize physical action. Send commands to hardware only when the assignment explicitly covers the equipment, operation and limits; the role itself confers no such permission.
