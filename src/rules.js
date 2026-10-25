export function isFree(tile, tiles) {
  if (tile.removed) return false;
  const active = tiles.filter(t => !t.removed && t.id !== tile.id);
  const overlaps = (a, b) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
  if (active.some(t => t.z > tile.z && overlaps(t, tile))) return false;
  const side = dx => active.some(t => t.z === tile.z && Math.abs(t.x - tile.x - dx) < 0.01 && Math.abs(t.y - tile.y) < 1);
  return !side(-1) || !side(1);
}

export function pairs(tiles) {
  const free = tiles.filter(t => isFree(t, tiles));
  return free.flatMap((a, i) => free.slice(i + 1).filter(b => a.face === b.face).map(b => [a, b]));
}

// Assign matching faces along a valid removal path, ensuring a solvable deal.
export const layoutNames = ['Terrace', 'Diamond', 'Butterfly', 'Random terraces'];
export const difficulties = {
  1: { name: 'Relaxed', rows: 4, width: 6, layers: 1 },
  2: { name: 'Balanced', rows: 6, width: 8, layers: 3 },
  3: { name: 'Challenging', rows: 8, width: 8, layers: 4 },
};

export function deal(random = Math.random, layout = 'Random', difficulty = 2) {
  const settings = difficulties[difficulty];
  if (!settings) throw new Error('Unknown difficulty');
  const tiles = [];
  if (layout === 'Random') layout = layoutNames[Math.floor(random() * layoutNames.length)];
  if (!layoutNames.includes(layout)) throw new Error('Unknown layout');
  const row = (y, width, z = 0, start = (8 - width) / 2) => {
    for (let x = start; x < start + width; x++) tiles.push({ id: tiles.length, x, y, z });
  };
  const shapes = {
    Terrace: [6, 8, 8, 8, 8, 6],
    Diamond: [2, 4, 8, 8, 4, 2],
    Butterfly: [8, 6, 4, 4, 6, 8],
  };
  const widths = Array.from({ length: settings.rows }, (_, y) => {
    const base = shapes[layout]?.[Math.round(y * 5 / (settings.rows - 1))]
      ?? 2 + 2 * Math.floor(random() * (settings.width / 2));
    return Math.min(settings.width, difficulty === 3 ? Math.max(6, base) : base);
  });
  widths.forEach((width, y) => {
    const start = layout === 'Random terraces' ? Math.floor(random() * (9 - width)) : (8 - width) / 2;
    row(y, width, 0, start);
    let upperStart = start;
    for (let z = 1; z < settings.layers && width - z * 2 >= 2; z++) {
      if (difficulty !== 3 && random() < (z === 1 ? .2 : .5)) break;
      upperStart += layout === 'Random terraces' ? Math.floor(random() * 3) : 1;
      row(y, width - z * 2, z, upperStart);
    }
  });
  let solution;
  // Try unrestricted pair paths. Retry dead ends before a guaranteed row-based fallback.
  for (let attempt = 0; attempt <= 64; attempt++) {
    tiles.forEach(t => { t.removed = false; });
    solution = [];
    while (tiles.some(t => !t.removed)) {
      let a, b;
      if (attempt === 64) {
        const options = removalOptions(tiles);
        if (!options.length) throw new Error('Layout cannot be paired');
        [a, b] = options[Math.floor(random() * options.length)];
      } else {
        const free = tiles.filter(t => isFree(t, tiles));
        if (free.length < 2) break;
        a = free.splice(Math.floor(random() * free.length), 1)[0];
        b = free[Math.floor(random() * free.length)];
      }
      solution.push([a.id, b.id]);
      a.removed = b.removed = true;
    }
    if (tiles.every(t => t.removed)) break;
  }
  // Alternate photo/standard identities before shuffling to keep the collection mixed.
  const identities = solution.map((_, i) => Math.floor(i / 2) % 10 + (i % 2) * 10);
  for (let i = identities.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [identities[i], identities[j]] = [identities[j], identities[i]];
  }
  solution.forEach(([a, b], i) => { tiles[a].face = tiles[b].face = identities[i]; });
  const result = tiles.map(t => ({ ...t, removed: false }));
  Object.defineProperties(result, { solution: { value: solution }, layout: { value: layout }, difficulty: { value: settings.name } });
  return result;
}

export function removalOptions(tiles) {
  const free = tiles.filter(t => isFree(t, tiles));
  return free.flatMap((a, i) => free.slice(i + 1).filter(b => a.y === b.y && a.z === b.z).map(b => [a, b]));
}
