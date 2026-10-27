# Seasonal scenic backgrounds

Eighteen original static scenes generated using the built-in OpenAI ImageGen tool. The exact final prompts are recorded in [prompts.json](./prompts.json). Selected outputs are bundled as 1536 × 1024 WebP images (about 6 MB total) for offline use. No remote image service is called by the game.

The art direction matches the main garden artwork: softly painted scenery, botanical details and antique gold highlights, with seasonal subjects at the lower left and a quieter center for tiles. The backgrounds scale with cover and stay anchored at the lower left, preserving the main subject without stretching.

`tools/import-seasonal-art.cjs` converts a local JSON map of theme IDs to selected source PNG paths into bundled WebP files and creates an ignored QA contact sheet. Original generation files are left intact.
