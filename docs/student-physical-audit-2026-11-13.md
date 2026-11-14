# Student physical audit — 13 November 2026

The current eight-student layout remains: five regular laptop readers, two robot-delivery readers, and one shelf-retrieval reader. The same books and bags persist; no visibility or scale switching was added.

## Corrections

- The two delivery books now rest 1.5 mm above the actual green felt (bottom y1.1895) instead of penetrating it by approximately1cm. Counter and robot-pad support remain exact. The robot's new telescopic pad is real geometry: top `.256 + platformLift`, lower-cover offset `-.025`, book-root `.281 + platformLift`; it must not be changed to `.250` without removing that pad.
- Wrist targets grip the two near cover corners rather than reaching across the payload centre. Standing idle wrists were raised to fit the actual imported forearm length; counter workers lean toward their task. Shoulder-target sweep of the actual Sam/Harper skeletons stays below0.511m for all four delivery actors. Their native arms are about0.509m and0.475m respectively, so the existing bounded IK still uses a small extension on Harper's longest poses.
- The shelf student's notebook and volume sit in separate supported areas. Notebook centre z2.91 keeps its transformed front edge on the tabletop; book centre z2.96 keeps the lower cover13.5mm inside the table edge. The seated torso turns toward the notebook or book and leans naturally while reading. Maximum shoulder target distance is0.482m for Harper (formerly0.572m).
- The shelf pickup endpoint moved8cm closer, toz-3.13, leaving the torso outside the bookshelf while avoiding a long reach. Laptop hand transitions now interpolate with the seated fraction instead of switching abruptly at0.8. Walking feet use a stance/swing cycle tied to travel distance.
- Moving readers wear their persistent backpacks behind the chair back (z-.33). Static readers' backpacks rest on the floor beside their chairs instead of intersecting the backrests.

## Evidence

`work/student-pose-audit.mjs` loads the actual GLBs with their skeletons and measures wrist targets from the transformed shoulder joints. `work/shelf-rig-reach-audit.mjs` applies the current shelf pose update to the same rigs.

A3360-second centre-clearance sweep (50ms steps) including both delivery workers, both delivery students, the shelf student, five seated readers, cataloguer, researchers, archivist and promenade found:

- Person-to-person minimum:0.42216m.
- Person-to-robot minimum:0.51624m, compared with a0.316m robot radius plus0.20m person envelope.
- Student torso centre to table footprint minimum:0.220m.
- Book-support error in counter, table and robot ownership: below numerical precision.
- Handoff/actor epsilon-step discontinuity: below0.003mm for a2-microsecond sampling interval.

These are analytic envelopes and real-rig reach checks; they do not certify every rendered finger, garment or backpack triangle. A stable visual review of the current production build remains required.
