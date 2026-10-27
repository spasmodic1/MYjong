# MYjong

**Familiar faces. A little time for you.**

An offline mahjong solitaire game for Windows, with traditional tiles and photos of the people and pets you love.

![MYjong with the approved starter pet collection](./docs/screenshots/myjong-pets.png)

Download the Windows installer from [Releases](https://github.com/spasmodic1/MYjong/releases). Install it, open MYjong, and choose two free matching tiles. A tile is free when uncovered and open on its left or right side.

## What's included

- Relaxed, Balanced, and Challenging puzzles; Terrace, Diamond, Butterfly, and randomized terrace layouts. Starting deals are solvable; later choices can leave dead ends.
- 35 painted traditional tile identities (including the red rabbit), photo collections, and evenly mixed photo/traditional deals.
- Match identical photos or different photos of the same named person or pet.
- Automatic save/resume, unlimited undo, cycling hints, and an undoable shuffle that seeks a solvable arrangement for the remaining stacks.
- Relaxed play or Challenge play with timer, scoring, personal bests, and small achievements. The timer pauses while a dialog is open, the game is paused, or its window is hidden.
- Race the Clock adds a matching pair to cleared positions every 5–120 seconds. New pairs are immediately removable. Clear the board to win; no safe space for the next pair ends the race. Pausing, dialogs, and hiding the game pause arrivals. Undo covers player moves since the latest arrival.
- Automatic no-moves popup, with background analysis of the move history and rollback before the first losing move when proven. If exact analysis reaches its limit, a verified solvable earlier position is offered instead, without claiming it is the first losing move.
- Local high scores with name entry and the last saved name prefilled. Categories distinguish play style, difficulty, layout, starting board size, and race interval. Challenge ranks score before time; Race ranks fastest clear before score. Up to 1,000 named results are retained, with the top 20 in each category shown.
- An original jade, ivory, and gold logo and Windows icon, illustrated botanical board frame, and styled menus. Comfortable text is the larger default; Standard and Large options are available.
- Scrollbars stay hidden; wheel, touch and keyboard scrolling remain available. A clickable More indicator appears when there is more content to see.
- Four preset backgrounds plus a custom background color picker; two tile finishes plus jade, blue, pink, and lavender tile colors; optional captions and blocked-tile dimming; matching sounds and eleven original arranged music tracks. Menu and game tunes can be selected separately and crossfade between scenes. Choices persist between sessions.
- Memory mode hides tile faces. Flip an available tile, then choose another; the previous face hides, and matching pairs disappear. Flip and quick tile-dealing animations respect reduced-motion settings.
- Modern porcelain tiles with large photo/symbol windows, compact controls, matched-pair effects, and Fit/+/− board zoom; motion effects respect the system's reduced-motion preference. See [visual reference notes](./DESIGN-NOTES.md).
- Folder and file importing; JPEG, PNG, WebP, AVIF and HEIC/HEIF conversion; phone uploads over home Wi-Fi through a QR code.
- Editable names, inclusion controls, reassignment, merging, independent copies/crops of group photos, pan/zoom/reset controls, and a full-photo option.
- New photos are analyzed automatically after file/folder import or phone upload. When a pet resembles confirmed library photos, MYjong asks “Is this Marley?” (or the matching name) with a reference picture. Person suggestions use face descriptors. Names always require confirmation; uncertain matches stay unnamed.
- Clear single-subject imports are framed automatically for the tile photo window. Multiple subjects and uncertain detections stay for review; full photos are retained when a safe crop cannot fit. Manual crops, including choosing Full photo, are preserved.
- ZIP backup/restore, with a safety backup before restoring; a Check for Updates button that downloads releases from this repository.

The starter collection contains 21 photos of five pets, supplied and approved by their owner for public distribution. Starter names are editable; any photo or subject can be excluded, and the starter collection can be removed. Original source photos are never modified by importing, framing, or deleting MYjong's copies. Future photos you import remain on your own computer and are never uploaded to GitHub.

![Import review asks whether the new photo is Marley](./docs/screenshots/is-this-marley.png)

The first analysis after launching can take a little longer while the bundled models initialize. Progress appears in the collection window. You can review later without losing an imported photo.

Person suggestions use SSD MobileNet face detection and full 68-point landmarks. Older reference photos are refreshed locally when needed. Confirming a name also helps with later photos in the same upload batch. Photo Collection opens with all photos visible, and the Needs a name filter is disabled when empty.

All traditional and seasonal tile faces use original painted artwork that matches the scenic backgrounds. The 35 traditional identities retain their familiar marks and counts; 126 seasonal illustrations replace the earlier emoji faces. Seasonal tiles match by picture alone; their plain names follow the Show names toggle. See [tile artwork notes](./assets/tiles/README.md).

## Seasonal themes

Automatic monthly themes add coordinated scenic artwork, tile finishes and seasonal faces. The top-bar chip previews the current month’s icon, tile and palette; click it to choose seasonal or default styling for the next puzzle. The current puzzle keeps its selected theme. Settings → Seasonal settings opens one collapsible dropdown with individual theme checkboxes, background/face switches and a preferred theme for months with alternatives. Christmas is the December default; Hanukkah, Winter Solstice, Lunar New Year (February styling), Earth Day, Summer Nights and Harvest are optional. Scheduling follows the computer’s local month, when each new puzzle starts; existing puzzles keep their theme across midnight and reloads. These are month-long styles, not calculated holiday dates. Eighteen original static scenes feature seasonal subjects at the lower left, botanical edges and a quiet center. Optional original music follows winter, spring/Easter, Halloween, Christmas and Hanukkah when music is enabled, including a spooky music-box arrangement and a Christmas bell/jingle arrangement. Other months use the selected game/menu tunes; disable Seasonal music to keep those tunes all year. Seasonal faces mix with traditional tiles by default; choose **All seasonal** to replace every traditional face. Matching copies always share the same style. Match the same seasonal picture; there are no numbered variants. Names can be shown or hidden. Existing numbered saves migrate to the simpler identities while preserving the board and undo history. Choosing a regular background or tile finish/color turns off the corresponding seasonal styling.

## Photos and saves

MYjong stores its photo library and saved game under `%APPDATA%\MYjong`, outside the installation folder. Updates keep that folder. Interactive uninstalling asks whether to delete all MYjong data for the current Windows user: Yes removes the stored photo copies, saves, scores, settings and caches; No keeps them for a reinstall; Cancel stops uninstalling. No is selected by default. Original photo files and backups exported outside MYjong data are preserved. Silent maintenance keeps data unless deletion is explicitly requested. Use **Settings → Create backup** to save a ZIP containing the collection and game, and **Restore backup** to move it to another computer.

For phone uploads, connect both devices to the same private home Wi-Fi, open **Photo collection → Send from phone**, and scan the QR code. Keep MYjong open while your photos finish sending. The QR dialog closes automatically when photos arrive, without interrupting the remaining selected photos. Manually closing a fresh QR dialog cancels that session. Its link expires after 15 minutes. Windows may request firewall access for the private network. Public Wi-Fi, guest networks with device isolation, and corporate networks may prevent the connection. The transfer is direct local HTTP with a randomly generated session link; use a trusted home network. No cloud account is required. Device photo pickers determine how many photos can be selected together. Imports are limited to 40 MB per photo and 500 files per batch.

**Android Chrome troubleshooting:** On Android 17, `ERR_TOO_MANY_RETRIES` when opening the phone link can be caused by a missing Chrome local-network permission. On the phone, open **Settings → Apps → Chrome → Permissions → Nearby devices → Allow**. If already allowed, re-grant the permission by switching it off and on, then force stop and reopen Chrome. Allow a separate Local network permission if the phone displays one. Retry a fresh MYjong QR link. Android groups its local-network permission under Nearby devices; see [Android local-network permission guidance](https://developer.android.com/privacy-and-security/local-network-permission).


Recognition can miss faces, confuse people, or miss small/obscured animals. Review suggested names and framing, especially group photos. The pet detector includes cats, dogs, birds and horses. A separate bundled DINOv2 image model compares detected animals with confirmed pet photos; these appearance-based suggestions are tentative, particularly for pets of similar breeds or coloring. MYjong never applies a suggested name without confirmation. You can always assign names and frame photos manually. Crops use the actual 4:5 photo window inside the portrait tile, with the full photo retained separately.

## Development

Use Windows x64 with Node.js 24 or newer:

```powershell
npm ci
node node_modules/electron/install.js
npm start
```

The installed game needs neither Node nor internet. A browser preview can also be served with `python -m http.server 8765 --bind 127.0.0.1`; desktop import, phone transfer, and updates are Windows-app features. Browser preview data uses IndexedDB and is separate from the installed game's files.

```powershell
npm test                 # Rules, deals, saves, crops, library and backups
npm run test:desktop     # Hidden Electron integration test
npm run test:models      # Bundled model inference; rejects remote requests
npm run test:imports     # Real pet-name prompt and manual framing preservation
npm run test:collection  # Filters, naming, reopening and photo preservation
npm run test:phone       # QR dismissal, multi-photo batch and manual cancellation
npm run test:personalization # Color previews, music playback and saved preferences
npm run test:race        # Arrivals, pause, reload, full-board loss and clear-board win
npm run test:loss        # Automatic loss popup and exact first-losing-move rollback
npm run test:scores      # Named records, persistence and last-used name
npm run test:memory      # Hidden faces, flips, matches, saves and reduced motion
npm run test:seasonal    # Monthly themes, opt-outs, preview toggle and persistence
npm run test:layouts     # Distinct silhouettes and quick dealing animation
npm run build            # Windows NSIS installer, blockmap and latest.yml
```

Recognition code is compiled into `assets/recognition.js`. Model files are checked in for offline builds; hashes and licenses are under `assets/`. To intentionally refresh models/bundle after dependency changes, run `npm run prepare:models` and review licenses and checksums. Packaging uses an explicit file allowlist. Raw `Photos/`, local photo catalogs, screenshots, app data, and local build directories are ignored. The approved starter collection is deliberately bundled as `assets/starter-collection.zip`.

## Releases and updates

`release-config.json` identifies this repository. The Windows app checks GitHub quietly once per launch and shows a small top-bar notice if a newer release is available. Startup checks never open an update popup, download an installer or restart the game; offline failures leave play uninterrupted. **Settings → Check for Updates** checks manually, asks before downloading, and asks before restarting to install. Updates preserve app data and never replace an existing photo library with the starter library. First-run starter extraction happens only when no library exists.

To publish the next version, update `package.json` and the lockfile, commit, and push a matching `vX.Y.Z` tag. GitHub Actions tests the app and publishes the installer, blockmap and `latest.yml` to a GitHub release using the workflow's repository token. No GitHub token is embedded in the app. Keep release tags and version numbers aligned. Do not upload backups or personal photo collections to releases unless those particular assets are explicitly approved for distribution.

The review installer is unsigned. Code signing and testing on the recipient's actual laptop remain release-polish tasks. See [third-party notices](./THIRD-PARTY-NOTICES.md) for component licenses. A license for MYjong's own source has not yet been selected; public source visibility does not grant a general redistribution license.
