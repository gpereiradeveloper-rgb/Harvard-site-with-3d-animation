# Visual gap: camera-film references and the live archive

This comparison uses the user's supplied reference screenshots, primary public template descriptions, and current source. It does not claim pixel-level reverse engineering of proprietary templates.

## What the primary sources actually establish

- Rann Mahal: https://www.scrolltide.co/templates/rann-mahal — described as a palace at dusk, one shot cut into 240 frames, with five copy chapters. Its runtime scroll selects frames from a prepared film.
- Umbral: https://www.scrolltide.co/templates — the library describes it as one camera film through a sandstone canyon and arch into a chamber. The dedicated Umbral page could not be fetched in this audit. The library's own description is sufficient to identify the film-led technique.
- These descriptions do not establish whether the original films were photographed, rendered offline, or generated. They do establish that their photographic appearance is already in the prepared image sequence. GSAP/DPR alone cannot create that appearance.

## Three highest-impact improvements

1. **Light transport and exposure hierarchy.** Before the latest root changes, ambient 1.55 plus hemisphere .95 overwhelmed the directional sun 1.15. The architecture was filled almost equally from every side, so form and depth read as a model. Use the right windows as the main key, keep practical lamps warmer and local, and reduce broad fill. N8AO is useful for local contact, but it is not diffuse global illumination. A later static Cycles lightmap bake would be the strongest realtime improvement; a prepared high-quality camera film is the reliable route to the exact film-led reference look.

2. **Material fidelity and physically coherent surroundings.** The former stone shader replaced 58% of its real albedo with one beige constant, reducing texture variation and even suppressing differences between trim and walls. That wash is removed in ArchiveHall. Pasted window photographs should be removed rather than sharpened; layered frosted glazing with a quiet transmitted-daylight surface now gives the openings a coherent treatment. The floor's dedicated reflection is still 512/1024 pixels with a broad blur, independent of the main canvas DPR. Its resolution/blur should be chosen for the intended oiled-wood surface, not treated as a general 8K fix.

3. **Composition and spatial density.** A photographic reference has depth cues at several scales: near doorway/column, mid-distance furniture, and a resolved far destination. The archive's real geometry now provides translation and parallax, but four similar arches and 3.3m cases in an 8m room can still feel sparse. Camera waypoints should compose distinct foreground/midground/far-ground relations, with copy leaving the architectural focal point clear. Another near column is more valuable than more particles. A later upper gallery could address the blank upper volume, but is outside the current bounded pass.

## Bounded ArchiveHall patch

- Replaced constant beige albedo mixing with a mild multiplicative calibration, preserving photographed plaster variation.
- Structural normal detail .13, wall .085; retained rough, pale, aged limestone character.
- Added subtle near-floor contact darkening in vertex colours, limited to structural stone/wall groups.
- Restored separate transmitted daylight behind the glass; changed glass to a milky/frosted treatment with a deterministic 1024px roughness/bump field and .8mm bump scale.
- Original mesh count remains 11 merged groups and 225,798 triangles. Geometry, normal, UV, colour arrays checked finite; module bundles successfully.
- This is not a photorealism certification. No browser QA was performed by this sub-agent. Parent owns lighting, floor, camera and final visual review.
