# MYjong 0.9.0 review handoff

- [Download the Windows review build](https://github.com/spasmodic1/MYjong/releases/tag/v0.9.0)
- [Source repository](https://github.com/spasmodic1/MYjong)
- [Visual reference review](./DESIGN-NOTES.md)

The public starter collection contains the 21 pet photos and five names approved by their owner. New user imports remain local. Automatic saves and the library live outside the installation directory. Release updates are served by this repository; they do not require a GitHub login in the game.

## Verified

- 17 rules/library/save/crop checks, including 1,500 generated deals across difficulties and layouts, backup and restoration, and unchanged source images.
- Desktop workflow: photo import, naming, crop, both collection integration and subject matching, hints, undo, save/reload, appearance persistence, pause, board clear, and phone HTTP upload/session authorization.
- Offline inference using bundled person and pet models, with no remote requests during inference.
- Packaged executable: first-run starter extraction, photo loading, zoom/Fit, final save when closing, and preservation of renamed/excluded subjects across launches.
- Real public GitHub update: an older packaged build checks the release, downloads it with checksum verification, and presents the restart prompt without changing its photos or saved board. Installation was declined in this automated test.
- HEIC conversion using a libheif example file, retaining the original input bytes.
- Package allowlist, model checksums, GitHub update configuration, and successful GitHub Actions builds/release.

## Review and final polish

- Play on the recipient's laptop at its actual Windows display scaling; check comfortable tile sizes, optional zoom, touch, captions, colors, and audio.
- Exercise the phone picker and upload workflow on actual iPhone and Android devices on the home Wi-Fi, including the Windows firewall prompt and device-specific HEIC photos.
- Review suggested face groups/crops; recognition is fallible and pet identity is manual.
- Verify installing an update over the installed app on the target laptop. The automatic integration test verifies discovery/download/checksum/restart prompting, not an actual installer restart.
- The review installer is unsigned. Decide on code signing and a license for MYjong's own source before broader distribution.

Screenshots are saved locally under `Screenshots/`; new capture runs create a timestamped folder. A representative approved-pet screenshot is in the public README. Raw source-photo folders, private backups, and local screenshots are excluded from source control and release packaging.
