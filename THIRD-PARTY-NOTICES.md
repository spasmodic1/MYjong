# MYjong third-party notices

MYjong uses the following components. Original music is synthesized by MYjong; tile marks, materials, backgrounds, and the icon are original code/vector artwork. The 21 starter pet photos and their names were supplied and approved by their owner for public distribution. This approval does not extend to any additional photos a user later imports.

- Electron — MIT. Chromium and bundled components retain their own notices in the Electron distribution (`LICENSE.electron.txt` and `LICENSES.chromium.html`). https://www.electronjs.org/
- electron-updater / electron-builder — MIT. https://github.com/electron-userland/electron-builder
- sharp — Apache-2.0. Its dynamically linked libvips/native distribution includes LGPL-3.0-or-later components. The unmodified native libraries remain replaceable outside the ASAR archive. Source/build information: https://github.com/lovell/sharp and https://github.com/libvips/libvips and https://github.com/lovell/sharp-libvips
- heic-convert and heic-decode — ISC. https://github.com/catdad-experiments/heic-convert and https://github.com/catdad-experiments/heic-decode
- libheif-js / libheif — LGPL-3.0. Unmodified library, source and build instructions: https://github.com/catdad-experiments/libheif-js and https://github.com/strukturag/libheif. Library files are unpacked from ASAR to permit replacement. MYjong does not restrict reverse engineering for debugging changes to these libraries.
- JSZip — MIT (chosen from its dual license). https://github.com/Stuk/jszip
- node-qrcode — MIT. https://github.com/soldair/node-qrcode
- Face-API by Vladimir Mandic — MIT. https://github.com/vladmandic/face-api. Uses tiny face detection, tiny face landmarks, and face recognition weights supplied by that project. Face recognition derives from Davis King's dlib network; its original model files are released into the public domain: https://github.com/davisking/dlib-models. Local person grouping is a suggestion requiring review, not a verified identity.
- TensorFlow.js and COCO-SSD — Apache-2.0. https://github.com/tensorflow/tfjs and https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd. The pet detector uses the bundled `ssdlite_mobilenet_v2` model from Google's TensorFlow.js model distribution. It detects animal classes and bounding boxes; it does not recognize individual pets.

License texts, model provenance, and a dependency inventory are included under `assets/licenses`. Model integrity hashes are in `assets/model-checksums.json`. No inference model or script is downloaded at runtime. Changes to library versions or models require a fresh dependency and license review before public release.

The project source has no open-source license selected yet. The bundled starter collection has the owner's permission for public distribution as part of MYjong; other family photos, future imports, and private backup files are not public release assets.
