# Visual reference review · October 25, 2026

This review covers mahjong **solitaire**, the pair-matching genre MYjong implements. Download ranges below are the public Google Play ranges, not an exhaustive global popularity ranking.

| Reference | Public evidence | Relevant design observations |
| --- | --- | --- |
| [Vita Mahjong](https://play.google.com/store/apps/details?id=com.vitastudio.mahjong) | 100M+ downloads; current official screenshots and listing | Large white tile faces, strongly legible symbols, visible green tile depth, dark calm background, clear free/blocked distinction. |
| [Mahjong Club by GamoVation](https://play.google.com/store/apps/details?id=com.gamovation.mahjongclub) | 10M+ downloads; current official screenshots | Bright smooth tiles, rounded corners, large colorful marks, clear stacking, low visual clutter on the board. |
| [Microsoft Mahjong](https://www.xbox.com/en-US/games/store/microsoft-mahjong/9wzdncrfhwcp) | Official Windows listing; Windows-oriented reference | Calm presentation, themes, visible controls, optional assistance, and board zoom. Its public listing does not give a comparable download count. |
| [MobilityWare Mahjong](https://play.google.com/store/apps/details?id=com.mobilityware.MahjongSolitaire) / [official gallery](https://www.mobilityware.com/mahjong/) | 5M+ downloads; official screenshot gallery | Recognizable traditional suits, readable layered boards, high contrast between available and blocked tiles. |

MYjong adopts the shared usability patterns with original implementation: cleaner porcelain by default, larger artwork/photo windows, readable photo names, stronger selection/hint feedback, short matched-pair animations, compact controls, subtle original background lighting, and Fit/+/− zoom controls. Ivory remains available. Reduced-motion preferences disable tile effects. The photo window retains its 4:5 ratio, so crop coordinates remain valid.

Competitor screenshots are research references only; their artwork, logos, tile designs, and branded content are not included in MYjong. Personal photos, offline play, unrestricted hints/undo, and the calm tone remain MYjong's focus.

## Original illustrated identity

Version 0.9.3 adds original generated jade, ivory and gold branding: an interwoven M emblem, MYjong wordmark and transparent botanical frame. Artwork stays around the playing surface while tile photos and traditional marks remain clear. Masters and the exact generation prompts are in [assets/branding](./assets/branding/PROMPTS.md); `tools/prepare-branding.cjs` exports WebP and Windows icon sizes. No personal photos were used for generation.

Comfortable text is 15% larger than the Standard scale, with a further Large option and roomier sidebar. Arbitrary custom backgrounds choose black or white board text by contrast. Motion preferences are respected. Race mode limits undo at arrival boundaries; the relaxed and challenge modes retain their existing undo behavior.
