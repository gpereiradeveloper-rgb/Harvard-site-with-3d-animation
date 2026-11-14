# Human crowd LOD derivatives — 13 November 2026

These local derivatives retain the original **CC0 1.0** dedication of the source characters. They are prepared for the archive's distant crowd. Original full-detail files remain available alongside them.

## Sources

- Sam: [Innerscene locomotion collection / MakeHuman CC0 assets](https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-sam-3d-person-animated-dc23800f).
- Harper: [Innerscene brisk walk / MakeHuman CC0 assets](https://www.innerscene.com/tools/library/3d-parts/brisk-walk-harper-3d-person-animated-0efea8f3).
- [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

## Treatment

The offline tool was meshoptimizer 1.1.1, using `simplifyWithAttributes`, `LockBorder` and `Regularize`. Only primitive index accessors were replaced. All original binary data remain as an identical prefix of each new GLB: positions, normals, UVs, joint IDs, skin weights, texture images, animation data and inverse bind matrices. Source nodes, skin/animation references, materials and texture references are unchanged. No vertex was moved, reweighted or rescaled.

Normal and UV attributes contribute to the simplification metric. Skin influences were sorted by joint ID to make weight attributes comparable. Vertices at categorical joint-influence-set boundaries were locked. The simplifier's relative appearance-error metric was capped at `0.001`; this is an approximate rest-mesh metric, **not a certified error bound for every articulated pose**. Bent elbows, knees, seated poses and hand interactions require runtime visual review.

| File | Original triangles | Crowd triangles | Reduction | Maximum relative metric |
|---|---:|---:|---:|---:|
| sam-locomotion-crowd-lod.glb | 91,610 | 52,870 | 42.29% | 0.0009996821 |
| harper-walk-crowd-lod.glb | 101,414 | 62,646 | 38.23% | 0.0009895286 |

Detailed per-primitive counts and integrity checks are in `human-crowd-lod-report.json`. New indices were checked for triangle completeness, exact accessor extrema and valid references to source vertices. The files retain Sam's seven clips and Harper's one clip. This change reduces drawn triangles; it does not reduce texture resolution or download size.

## Integrity

| File | Bytes | SHA-256 |
|---|---:|---|
| sam-locomotion-crowd-lod.glb | 22,192,232 | c361a2ef5de81bc1d1074cf979448d2c97f4cf846b5269791ff938a5c80ca521 |
| harper-walk-crowd-lod.glb | 19,090,712 | f5ac86d3c78b0818b4545226124fe7a7c8fc8c068bdb3fc0d63dc5d5f3183177 |
