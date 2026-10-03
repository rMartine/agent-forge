---
name: research-robotics
description: Investigate an authorized robotic system question involving kinematics, dynamics, estimation, planning or control with explicit frames, timing, constraints and simulation or hardware evidence.
---

# Robotics research

Read [the assignment conditions](../../roles/research-specialist-common.md). Identify the robot or modeled mechanism, task, environment and the component under study. Separate a mathematical model, simulated experiment and physical operation before selecting procedures.

## Establish the system representation

Document coordinate frames, transform direction, handedness, units and time bases. State kinematic and dynamic assumptions, actuator and sensing models, calibration and operating limits relevant to the question. Check frame and unit consistency across measurements, estimates, plans and commands.

For estimation, describe observability assumptions, noise treatment, initialization and the information available at each time. For planning, define feasibility and collision or task constraints. For control, state the model, sampling and delay conditions under which stability or performance arguments apply. These branches apply only to the component assigned; do not redesign the whole robot.

## Execute interpretable experiments

Record initial conditions, trajectories, disturbances and interventions for the authorized comparisons. Distinguish a planned command, transmitted command and measured physical response. Report constraint violations, unsuccessful trials and recovery behavior alongside task completion when observed.

Coordinate learned perception or policy contributions with the appropriate research specialist through the direction of research. A simulator's assumptions must remain visible when interpreting transfer to hardware. Stability claimed for a model under stated assumptions is not a blanket guarantee for the physical system.

Return the model or algorithm, frame and timing conventions, reproducible experiment conditions, results and limitations. Physical actuation requires authorization covering equipment, actions and limits; developing code or running a simulator grants none. Describe missing hardware evidence explicitly rather than treating simulation as a completed physical test.
