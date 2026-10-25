import { deal, isFree } from './rules.js';

export const defaults = { layout: 'Random', difficulty: 1, theme: '', collection: 'mixed',
  matching: 'identical', mode: 'relaxed', available: true, captions: true,
  sound: true, music: false, volume: .3, tileStyle: 'porcelain', zoom: 1 };
export const emptyStats = () => ({ played: 0, won: 0, matches: 0, best: {}, achievements: [] });
export const photoUrl = (p, original = false) => p.src || `myjong://app/photo/${p.id}/${original ? 'original' : 'tile'}?v=${p.revision || 0}`;
export function makeGame(settings, library, random = Math.random) {
  const board = deal(random, settings.layout, settings.difficulty);
  const included = library.photos.filter(p => p.included && library.subjects.some(s => s.id === p.subjectId && s.included));
  let photos;
  if (settings.matching === 'subject') {
    photos = library.subjects.filter(s => s.included).map(s => ({ name: s.name, subjectId: s.id,
      variants: included.filter(p => p.subjectId === s.id).map(p => ({ id: p.id, src: photoUrl(p) })) })).filter(p => p.variants.length);
  } else photos = included.map(p => ({ name: library.subjects.find(s => s.id === p.subjectId).name, subjectId:p.subjectId,
    variants: [{ id: p.id, src: photoUrl(p) }] }));
  photos = shuffle(photos, random).slice(0, 10);
  const standard = shuffle(Array.from({ length: 34 }, (_, i) => i + 10),random);
  let identities = settings.collection === 'traditional' ? standard : photos.map((_, i) => i);
  if (settings.collection === 'mixed' && photos.length) identities = standard.flatMap((face,i)=>[i%photos.length,face]);
  if (!identities.length) identities = standard;
  board.solution.forEach(([a, b], i) => {
    const face = identities[i % identities.length];
    for (const id of [a, b]) {
      board[id].face = face;
      if (face < 10) board[id].variant = Math.floor(random() * photos[face].variants.length);
    }
  });
  const game = { tiles: board.map(t => ({ ...t })), layout: board.layout, difficulty: board.difficulty,
    level: settings.difficulty, photos, history: [], elapsed: 0, hints: 0, shuffles: 0,
    mode: settings.mode, matching: settings.matching, recorded: false, started: Date.now() };
  return game;
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function reshuffle(game, random = Math.random) {
  const active = game.tiles.filter(t => !t.removed);
  if (!active.length) return false;
  const identities = [];
  const counts = new Map();
  active.forEach(t => counts.set(t.face, (counts.get(t.face) || 0) + 1));
  for (const [face, count] of counts) {
    if (count % 2) return false;
    for (let i = 0; i < count / 2; i++) identities.push(face);
  }
  for (let attempt = 0; attempt < 256; attempt++) {
    const copy = game.tiles.map(t => ({ ...t })), path = [];
    while (copy.some(t => !t.removed)) {
      const free = shuffle(copy.filter(t => isFree(t, copy)), random);
      if (free.length < 2) break;
      const a = free[0], b = free[1];
      path.push([a.id, b.id]); a.removed = b.removed = true;
    }
    if (copy.some(t => !t.removed)) continue;
    const faces = shuffle(identities, random);
    path.forEach((pair, i) => pair.forEach(id => {
      const tile = game.tiles.find(t => t.id === id); tile.face = faces[i];
      tile.variant = tile.face < 10 ? Math.floor(random() * game.photos[tile.face].variants.length) : 0;
    }));
    // A shuffle is an undoable transaction, including all prior removed tiles.
    return true;
  }
  return false;
}
export const score = game => Math.max(0, game.tiles.filter(t => t.removed).length * 50 - game.hints * 15 - game.shuffles * 100);
export function validState(state) {
  if (!state || state.version !== 2 || !state.game || !state.settings || !state.stats) return false;
  const g = state.game,s=state.settings,stats=state.stats;
  if(!['Random','Terrace','Diamond','Butterfly','Random terraces'].includes(s.layout)
    || ![1,2,3].includes(s.difficulty) || !['','blue','plum','sand'].includes(s.theme)
    || !['mixed','photos','traditional'].includes(s.collection) || !['identical','subject'].includes(s.matching)
    || !['relaxed','challenge'].includes(s.mode) || !Number.isFinite(s.volume) || s.volume<0 || s.volume>1
    || !['played','won','matches'].every(k=>Number.isInteger(stats[k]) && stats[k]>=0)
    || !Array.isArray(stats.achievements) || stats.achievements.some(a=>typeof a!=='string')
    || !stats.best || typeof stats.best!=='object')return false;
  if (!Array.isArray(g.tiles) || g.tiles.length < 2 || g.tiles.length > 300 || g.tiles.length % 2
    || !Array.isArray(g.photos) || g.photos.length > 10 || !Array.isArray(g.history) || g.history.length>1000
    || !Number.isFinite(g.elapsed) || g.elapsed < 0) return false;
  if(!['Relaxed','Balanced','Challenging'].includes(g.difficulty) || ![1,2,3].includes(g.level)
    || !['relaxed','challenge'].includes(g.mode) || !['identical','subject'].includes(g.matching)
    || !Number.isInteger(g.hints) || g.hints<0 || !Number.isInteger(g.shuffles) || g.shuffles<0
    || typeof g.recorded!=='boolean')return false;
  if(g.photos.some(p=>typeof p.name!=='string' || !Array.isArray(p.variants) || !p.variants.length
    || p.variants.some(v=>typeof v.src!=='string' || !/^(myjong:\/\/(app\/photo\/|photo\/)|\.\/Photos\/|data:image\/)/.test(v.src))))return false;
  const ids = new Set();
  for (const t of g.tiles) {
    if (!Number.isInteger(t.id) || ids.has(t.id) || !Number.isInteger(t.face) || t.face < 0 || t.face > 43
      || !Number.isFinite(t.x) || t.x < 0 || t.x > 8 || !Number.isFinite(t.y) || t.y < 0 || t.y > 8
      || !Number.isInteger(t.z) || t.z < 0 || t.z > 3 || typeof t.removed !== 'boolean') return false;
    if (t.face < 10 && !g.photos[t.face]?.variants?.length) return false;
    ids.add(t.id);
  }
  let rewind=g.tiles.map(t=>({...t}));
  for(const entry of [...g.history].reverse()) {
    if(entry.type==='match') {
      if(!Array.isArray(entry.ids) || entry.ids.length!==2 || entry.ids[0]===entry.ids[1])return false;
      const [a,b]=entry.ids.map(id=>rewind.find(t=>t.id===id));
      if(!a?.removed || !b?.removed || a.face!==b.face)return false;
      a.removed=b.removed=false;
    } else if(entry.type==='shuffle') {
      if(!Array.isArray(entry.tiles) || entry.tiles.length!==g.tiles.length)return false;
      const seen=new Set();
      for(const t of entry.tiles) {
        const current=rewind.find(c=>c.id===t.id);
        if(!current || seen.has(t.id) || t.x!==current.x || t.y!==current.y || t.z!==current.z
          || t.removed!==current.removed || !Number.isInteger(t.face) || t.face<0 || t.face>43
          || t.face<10 && !g.photos[t.face])return false;
        seen.add(t.id);
      }
      rewind=entry.tiles.map(t=>({...t}));
    } else return false;
  }
  if(rewind.some(t=>t.removed))return false;
  if(g.recorded && g.tiles.some(t=>!t.removed))return false;
  return true;
}
