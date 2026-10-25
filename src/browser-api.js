// Browser preview uses IndexedDB. The installed app uses durable files via preload.
export async function browserAPI() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('myjong-preview', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('data');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const get = key => new Promise((resolve, reject) => {
    const request = db.transaction('data').objectStore('data').get(key);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const put = (key, value) => new Promise((resolve, reject) => {
    const transaction = db.transaction('data', 'readwrite');
    transaction.objectStore('data').put(value, key);
    transaction.oncomplete = () => resolve(true); transaction.onerror = () => reject(transaction.error);
  });
  let library = await get('library') || { version: 1, subjects: [], photos: [] };
  // Optional private development collection; never bundled in the public installer.
  if (!await get('seeded')) {
    try {
      const response = await fetch('./photo-catalog.json');
      if (response.ok) {
        for (const p of await response.json()) {
          let subject = library.subjects.find(s => s.name === p.name);
          if (!subject) { subject = { id: crypto.randomUUID(), name: p.name, kind: 'pet', included: true }; library.subjects.push(subject); }
          library.photos.push({ id: crypto.randomUUID(), name: p.name, subjectId: subject.id, included: true, src: p.src, revision: 0 });
        }
      }
      await put('library', library); await put('seeded', true);
    } catch { /* The preview also works with a traditional collection. */ }
  }
  const commit = async () => { await put('library', library); return structuredClone(library); };
  return {
    load: async () => ({ state: await get('state'), library: structuredClone(library), version: '0.9.0 · Browser preview', desktop: false }),
    save: state => put('state', state), library: async () => structuredClone(library),
    async importPhotos(files) {
      let added = 0; const errors = [];
      for (const file of files) {
        try {
          if (!/^image\//.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw Error('Use the Windows app to import HEIC photos.');
          if (file.size > 40 * 1024 * 1024) throw Error('Photo is over 40 MB.');
          const src = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
          const image = new Image(); image.src = src; await image.decode();
          library.photos.push({ id: crypto.randomUUID(), name: file.name, src, originalSrc: src,
            width: image.naturalWidth, height: image.naturalHeight, included: true, subjectId: null, revision: 0 }); added++;
        } catch (e) { errors.push(`${file.name}: ${e.message}`); }
      }
      return { library: await commit(), added, duplicates: 0, errors };
    },
    async changePhoto(action) {
      if (action.type === 'subject') {
        let s = library.subjects.find(s => s.id === action.id);
        if (!s) { s = { id: crypto.randomUUID() }; library.subjects.push(s); }
        Object.assign(s, { name: action.name.trim(), kind: action.kind, included: action.included });
      } else if (action.type === 'merge') {
        library.photos.filter(p => p.subjectId === action.from).forEach(p => { p.subjectId = action.to; });
        library.subjects = library.subjects.filter(s => s.id !== action.from);
      } else {
        const p = library.photos.find(p => p.id === action.id);
        if (action.type === 'analysis') p.analysis=action.detections;
        else if (action.type === 'copy') library.photos.push({ ...p,id:crypto.randomUUID(),subjectId:null });
        else if (action.type === 'delete') library.photos = library.photos.filter(p => p.id !== action.id);
        else if (action.type === 'photo') Object.assign(p, { subjectId: action.subjectId, included: action.included });
        else if (action.type === 'crop') {
          const image = new Image(); image.src = p.originalSrc || p.src; await image.decode();
          p.originalSrc ||= p.src;
          if (!action.crop) p.src = p.originalSrc;
          else {
            const { x, y, zoom } = action.crop, w = image.naturalWidth, h = image.naturalHeight;
            const width = Math.min(w, h * .8) / zoom, height = width / .8;
            const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 450;
            canvas.getContext('2d').drawImage(image, (w-width)*x, (h-height)*y, width, height, 0, 0, 360, 450);
            p.src = canvas.toDataURL('image/jpeg', .9);
          }
          p.crop = action.crop; p.revision++;
        }
      }
      return commit();
    },
    async backup() {
      const blob = new Blob([JSON.stringify({ version: 1, library, state: await get('state') })], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'MYjong-preview-backup.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000); return true;
    },
    update: async () => 'Updates are available in the installed Windows app.',
  };
}
