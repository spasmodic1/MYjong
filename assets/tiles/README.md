# Painted tile artwork

All 35 traditional identities and 126 seasonal illustrations use original transparent artwork generated with the built-in OpenAI ImageGen tool. The style combines painted porcelain/enamel, botanical detail, jade, lapis, cinnabar and antique gold to match the scenic backgrounds.

Traditional files live in `traditional/0.webp` through `traditional/34.webp`, in the stable identity order defined by `src/standard-tiles.js`. Seasonal illustrations live in `../seasonal/tiles/<theme>/0.webp` through `6.webp`. All are 320 × 320 with genuine transparency and contained sizing. Source photos are unaffected.

Exact generation prompts are in [tile-art-prompts.json](../seasonal/tile-art-prompts.json); corrections are recorded in [tile-art-corrections.json](../seasonal/tile-art-corrections.json). Bamboo 7 was regenerated after visual review caught an incorrect count. Traditional circles, bamboo counts and Chinese symbols were checked against their named identities. July retains the red-white-blue USA artwork.

`tools/import-seasonal-tiles.cjs` slices selected generated atlases; `tools/apply-tile-art-overrides.cjs` applies reviewed single-image replacements. Both accept local manifests, preserve the original generation files, and produce offline bundled assets. `tools/inspect-tile-art.cjs` renders ignored QA contact sheets.

Seasonal number markers are part of the matching identity and remain visible when names are hidden. The seven pictures each have five numbered variants, preserving 35 distinct identities. Traditional tiles use their recognizable conventional marks instead.
