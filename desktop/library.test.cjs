const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const JSZip = require('jszip');
const { Library, cropRectangle } = require('./library.cjs');

test('local library copies, deduplicates, assigns, crops, merges and backs up photos', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'myjong-library-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const original = path.join(dir, 'pet.png');
  await sharp({ create: { width: 800, height: 600, channels: 3, background: '#aacc77' } }).png().toFile(original);
  const lib = await new Library(path.join(dir, 'data')).init();
  let result = await lib.import([original], 'Pet'); assert.equal(result.added, 1);
  const photo = result.library.photos[0];
  assert.equal(result.library.subjects[0].name, 'Pet');
  result = await lib.import([original]); assert.equal(result.duplicates, 1);
  await lib.change({ type: 'crop', id: photo.id, crop: { x: .8, y: .2, zoom: 2 } });
  const meta = await sharp(lib.file(photo.id)).metadata(); assert.equal(meta.width / meta.height, .8);
  assert.ok(await fs.stat(original));
  await lib.change({ type: 'subject', name: 'Renamed', included: true });
  const target = lib.data.subjects[1];
  await lib.change({ type: 'merge', from: photo.subjectId, to: target.id });
  assert.equal(lib.data.photos[0].subjectId, target.id); assert.equal(lib.data.subjects.length, 1);
  const backup = path.join(dir, 'backup.zip'); await lib.backup(backup);
  const zip = await JSZip.loadAsync(await fs.readFile(backup));
  assert.ok(zip.file('library.json')); assert.ok(zip.file(`photos/${photo.id}-original.jpg`));
  await lib.change({ type: 'delete', id: photo.id }); assert.equal(lib.data.photos.length, 0);
  assert.ok(await fs.stat(original));
  await lib.restore(backup);assert.equal(lib.data.photos.length,1);assert.equal(lib.data.subjects[0].name,'Renamed');
  assert.ok(await fs.stat(lib.file(photo.id)));
  assert.ok((await fs.readdir(lib.root)).some(f=>f.startsWith('before-restore-')));
});
test('crop rectangles fit image boundaries and use the photo window ratio', () => {
  for (const [w,h] of [[1000,400],[400,1000],[1,1]]) for (const x of [0,.5,1]) {
    const r = cropRectangle(w,h,{ x,y:x,zoom:2 });
    assert.ok(r.left >= 0 && r.top >= 0 && r.left+r.width <= w && r.top+r.height <= h);
  }
});
