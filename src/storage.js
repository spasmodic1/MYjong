import { difficulties, layoutNames } from './rules.js';

export const saveKey = 'myjong.save.v1';

export function writeSave(storage, state) {
  try {
    storage.setItem(saveKey, JSON.stringify({ version: 1, ...state,
      layout: state.tiles.layout, difficulty: state.tiles.difficulty }));
    return true;
  } catch { return false; }
}

export function readSave(storage) {
  try {
    const state = JSON.parse(storage.getItem(saveKey));
    if (state?.version !== 1 || !layoutNames.includes(state.layout)
      || !Object.values(difficulties).some(d => d.name === state.difficulty)
      || !Array.isArray(state.tiles) || state.tiles.length < 2 || state.tiles.length > 300
      || state.tiles.length % 2) return null;
    const ids = new Set();
    for (const t of state.tiles) {
      if (!Number.isInteger(t.id) || ids.has(t.id)
        || !Number.isFinite(t.x) || t.x < 0 || t.x > 8
        || !Number.isFinite(t.y) || t.y < 0 || t.y > 8
        || !Number.isInteger(t.z) || t.z < 0 || t.z > 3
        || !Number.isInteger(t.face) || t.face < 0 || t.face > 19
        || typeof t.removed !== 'boolean') return null;
      ids.add(t.id);
    }
    if (!Array.isArray(state.history)) return null;
    const undone = state.tiles.map(t => ({ ...t }));
    for (const pair of [...state.history].reverse()) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair[0] === pair[1]) return null;
      const [a, b] = pair.map(id => undone.find(t => t.id === id));
      if (!a?.removed || !b?.removed || a.face !== b.face) return null;
      a.removed = b.removed = false;
    }
    if (undone.some(t => t.removed)) return null;
    if (!['', 'blue', 'plum'].includes(state.theme)
      || !['Random', ...layoutNames].includes(state.nextLayout)
      || ![1, 2, 3].includes(state.nextDifficulty)) return null;
    if (!Array.isArray(state.photos) || state.photos.length > 10
      || state.photos.some(p => typeof p.name !== 'string' || typeof p.src !== 'string'
        || !p.src.startsWith('./Photos/') || p.src.includes('..'))) return null;
    Object.defineProperties(state.tiles, {
      layout: { value: state.layout }, difficulty: { value: state.difficulty },
    });
    return state;
  } catch { return null; }
}
