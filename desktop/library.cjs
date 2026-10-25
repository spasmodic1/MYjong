const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const sharp = require('sharp');
const JSZip = require('jszip');
const accepted = /\.(jpe?g|png|webp|heic|heif|avif)$/i;
const validId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);
const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));

class Library {
  constructor(root) { this.root = root; this.queue = Promise.resolve(); }
  async init() {
    await fs.mkdir(path.join(this.root, 'photos'), { recursive: true });
    this.data = await this.read('library.json', { version: 1, subjects: [], photos: [] });
    return this;
  }
  async read(file, fallback) {
    try { return JSON.parse(await fs.readFile(path.join(this.root, file), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return fallback; throw new Error(`Cannot read ${file}. Your existing data has been preserved.`); }
  }
  async atomic(file, data) {
    const target = path.join(this.root, file), temp = `${target}.tmp`;
    await fs.writeFile(temp, JSON.stringify(data));
    await fs.rename(temp, target);
  }
  exclusive(fn) {
    const job = this.queue.then(fn);
    this.queue = job.catch(() => {});
    return job;
  }
  snapshot() { return structuredClone(this.data); }
  async commit() { await this.atomic('library.json', this.data); return this.snapshot(); }
  async import(files, subjectName = '') {
    return this.exclusive(async () => {
      let added = 0, duplicates = 0; const errors = [], addedIds=[];
      for (const file of files.slice(0, 500)) {
        try {
          if (!accepted.test(file)) continue;
          const stat = await fs.stat(file);
          if (stat.size > 40 * 1024 * 1024) throw Error('over 40 MB');
          const original = await fs.readFile(file);
          const hash = createHash('sha256').update(original).digest('hex');
          if (this.data.photos.some(p => p.hash === hash)) { duplicates++; continue; }
          let buffer = original;
          if (/\.hei[cf]$/i.test(file)) buffer = Buffer.from(await require('heic-convert')({ buffer: original, format: 'JPEG', quality: .94 }));
          const id = randomUUID();
          const image = await sharp(buffer, { limitInputPixels: 80000000 }).rotate().resize(2400, 2400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
          const meta = await sharp(image).metadata();
          await fs.writeFile(this.file(id, 'original'), image);
          await sharp(image).resize(360, 450, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(this.file(id, 'tile'));
          const name = String(subjectName).trim().slice(0, 80);
          let subject = name && this.data.subjects.find(s => s.name.toLowerCase() === name.toLowerCase());
          if (name && !subject) { subject = { id: randomUUID(), name, included: true, kind: 'pet' }; this.data.subjects.push(subject); }
          this.data.photos.push({ id, hash, name: path.basename(file), subjectId: subject?.id || null,
            width: meta.width, height: meta.height, included: true, crop: null, revision: 0 });
          added++;addedIds.push(id);
        } catch (e) { errors.push(`${path.basename(file)}: ${e.message}`); }
      }
      await this.commit();
      return { library: this.snapshot(), added, duplicates, errors,addedIds };
    });
  }
  file(id, variant = 'tile') {
    if (!validId(id) || !['tile', 'original'].includes(variant)) throw Error('Invalid photo');
    return path.join(this.root, 'photos', `${id}-${variant}.jpg`);
  }
  async change(action) {
    return this.exclusive(async () => {
      if (action.type === 'subject') {
        let subject = this.data.subjects.find(s => s.id === action.id);
        const name = String(action.name || '').trim().slice(0, 80);
        if (!name) throw Error('Please enter a name.');
        if (!subject) { subject = { id: randomUUID() }; this.data.subjects.push(subject); }
        Object.assign(subject, { name, included: action.included !== false, kind: action.kind === 'person' ? 'person' : 'pet' });
      } else if (action.type === 'merge') {
        if (action.from === action.to || !this.data.subjects.some(s => s.id === action.to)) throw Error('Choose a different destination.');
        this.data.photos.filter(p => p.subjectId === action.from).forEach(p => { p.subjectId = action.to; });
        this.data.subjects = this.data.subjects.filter(s => s.id !== action.from);
      } else {
        const photo = this.data.photos.find(p => p.id === action.id);
        if (!photo) throw Error('Photo no longer exists.');
        if (action.type === 'analysis') {
          if (!Array.isArray(action.detections) || action.detections.length > 20) throw Error('Invalid detections');
          photo.analysis = action.detections.map(d => {
            if (!Array.isArray(d.box) || d.box.length !== 4 || !d.box.every(Number.isFinite)) throw Error('Invalid detection box');
            return { kind: String(d.kind).slice(0,20), score:clamp(d.score,0,1), box:d.box,
              descriptor:Array.isArray(d.descriptor) && d.descriptor.length === 128 && d.descriptor.every(Number.isFinite) ? d.descriptor : null };
          });
        } else if (action.type === 'copy') {
          const id = randomUUID();
          await Promise.all(['original','tile'].map(v => fs.copyFile(this.file(photo.id,v), this.file(id,v))));
          this.data.photos.push({ ...photo, id, subjectId: null });
        } else if (action.type === 'photo') {
          if (action.subjectId && !this.data.subjects.some(s => s.id === action.subjectId)) throw Error('Unknown name');
          photo.subjectId = action.subjectId || null;
          photo.included = action.included !== false;
          if(action.identity && Array.isArray(action.identity.box) && action.identity.box.length===4 && action.identity.box.every(Number.isFinite))photo.identity=action.identity;
        } else if (action.type === 'crop') {
          const meta = await sharp(this.file(photo.id, 'original')).metadata();
          let image = sharp(this.file(photo.id, 'original'));
          if (action.crop) {
            const { left, top, width, height } = cropRectangle(meta.width, meta.height, action.crop);
            image = image.extract({ left, top, width, height });
            photo.crop = { x: clamp(action.crop.x, 0, 1), y: clamp(action.crop.y, 0, 1), zoom: clamp(action.crop.zoom, 1, 5) };
          } else photo.crop = null;
          await image.resize(360, 450, { fit: 'inside' }).jpeg({ quality: 90 }).toFile(this.file(photo.id, 'tile'));
          photo.revision++;
          photo.framing=action.automatic?'automatic':'manual';
        } else if (action.type === 'delete') {
          // Keep files referenced by a saved game until a new game releases them.
          this.data.photos = this.data.photos.filter(p => p.id !== photo.id);
          const state = await this.read('state.json', null);
          if (!JSON.stringify(state?.game?.photos || []).includes(photo.id)) {
            await Promise.all(['tile', 'original'].map(v => fs.rm(this.file(photo.id, v), { force: true })));
          }
        } else throw Error('Unknown library action');
      }
      return this.commit();
    });
  }
  async backup(target) {
    return this.exclusive(async () => {
      const zip = new JSZip();
      zip.file('library.json', JSON.stringify(this.data));
      zip.file('state.json', JSON.stringify(await this.read('state.json', null)));
      for (const filename of await fs.readdir(path.join(this.root, 'photos'))) {
        if (/^[a-f0-9-]{36}-(original|tile)\.jpg$/.test(filename)) zip.file(`photos/${filename}`, await fs.readFile(path.join(this.root, 'photos', filename)));
      }
      await fs.writeFile(target, await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' }));
    });
  }
  async restore(source) {
    const zip = await JSZip.loadAsync(await fs.readFile(source));
    const entries = Object.values(zip.files).filter(f => !f.dir);
    if (entries.length > 10005 || entries.reduce((n,f) => n + (f._data?.uncompressedSize || 0),0) > 2 * 1024 ** 3) throw Error('This backup is too large.');
    if (!zip.file('library.json')) throw Error('This is not a MYjong backup.');
    const data = JSON.parse(await zip.file('library.json').async('string'));
    if (data.version !== 1 || !Array.isArray(data.photos) || !Array.isArray(data.subjects)
      || data.photos.some(p => !validId(p.id)) || data.subjects.some(s => !validId(s.id) || typeof s.name !== 'string')) throw Error('The backup library is invalid.');
    const restoredState = zip.file('state.json') ? JSON.parse(await zip.file('state.json').async('string')) : null;
    if (restoredState && !(await import('../src/game.js')).validState(restoredState)) throw Error('The saved game in this backup is invalid.');
    const images = [];
    for (const photo of data.photos) for (const variant of ['original','tile']) {
      if (!zip.file(`photos/${photo.id}-${variant}.jpg`)) throw Error('The backup is missing a photo.');
    }
    for (const file of entries.filter(f=>/^photos\/[a-f0-9-]{36}-(original|tile)\.jpg$/.test(f.name))) {
      const match=/^photos\/([a-f0-9-]{36})-(original|tile)\.jpg$/.exec(file.name);
      const bytes = await file.async('nodebuffer'); await sharp(bytes,{limitInputPixels:80000000}).metadata();
      images.push({ id:match[1], variant:match[2], bytes });
    }
    const safety = path.join(this.root, `before-restore-${Date.now()}.zip`);
    await this.backup(safety);
    return this.exclusive(async () => {
      for (const image of images) await fs.writeFile(this.file(image.id,image.variant), image.bytes);
      await this.atomic('library.json',data); await this.atomic('state.json',restoredState);
      this.data=data; return { library:this.snapshot(), state:restoredState };
    });
  }
}
function cropRectangle(w, h, crop) {
  const zoom = clamp(crop.zoom, 1, 5), ratio = .8;
  const width = Math.max(1, Math.floor(Math.min(w, h * ratio) / zoom));
  const height = Math.max(1, Math.floor(width / ratio));
  return { width, height, left: Math.round((w - width) * clamp(crop.x, 0, 1)), top: Math.round((h - height) * clamp(crop.y, 0, 1)) };
}
module.exports = { Library, cropRectangle, accepted };
