# Original MYjong arrangements

These six stereo arrangements are original software-instrument compositions, rendered by `tools/compose-music.cjs`. They use no third-party recordings, samples or downloaded music. Ogg Vorbis files are bundled for offline playback.

The arrangements layer felt-piano-like partials, plucked harp-like tones, soft sustained harmony, bass, humanized timing, stereo placement and room reflections. Each has a 32-bar form with variations, approximately 80–116 seconds long. `welcome.ogg` is the default menu theme; the selected game tune resumes when menus close.

To regenerate, install FFmpeg and run `node tools/compose-music.cjs` from the project root. WAV intermediates are written under ignored `test-results/music-renders`; only Ogg files and the arrangement report are released. The report records duration, peak level, RMS and the sample step at the loop boundary. Rendering mixes note tails and reflections across the boundary so the arrangement can repeat.
