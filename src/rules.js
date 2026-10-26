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
  1: { name: 'Relaxed', rows: 6, width: 6, layers: 1 },
  2: { name: 'Balanced', rows: 8, width: 8, layers: 3 },
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
  if(layout==='Terrace'){
    const rows=difficulty===1?4:difficulty===2?6:8,width=difficulty===1?6:8;
    for(let z=0;z<settings.layers;z++)for(let y=z;y<rows-z;y++)row(y,width-z*2,z,(8-width)/2+z);
  }else if(layout==='Diamond'){
    const layers=difficulty===1?[[1,3,5,5,3,1]]:difficulty===2?[[1,3,5,7,7,5,3,1],[1,3,5,5,3,1],[1,3,3,1]]:[[1,3,5,9,9,5,3,1],[1,3,7,7,3,1],[1,5,5,1],[3,3]];
    const center=difficulty===3?4:3.5;
    layers.forEach((widths,z)=>widths.forEach((width,y)=>row(y+z,width,z,center-(width-1)/2)));
  }else if(layout==='Butterfly'){
    const base=difficulty===1?['##....##','.##..##.','..####..','..####..','.##..##.','##....##']:['##....##','###..###','########','..####..','..####..','########','###..###','##....##'];
    const masks=[base];
    if(difficulty>=2)masks.push(['........','.##..##.','.##..##.','...##...','...##...','.##..##.','.##..##.','........'],['........','........','.##..##.','........','........','.##..##.','........','........']);
    if(difficulty===3){
      masks[1][0]=masks[1][7]='##....##';masks[2][1]=masks[2][6]='.##..##.';
      masks.push(['........','........','.##..##.','........','........','.##..##.','........','........']);
    }
    masks.forEach((rows,z)=>rows.forEach((mask,y)=>[...mask].forEach((cell,x)=>{if(cell==='#')tiles.push({id:tiles.length,x,y,z});})));
  }else{
    for(let y=0;y<settings.rows;y++){
      const width=2+2*Math.floor(random()*(settings.width/2)),start=Math.floor(random()*(9-width));row(y,width,0,start);let upperStart=start;
      for(let z=1;z<settings.layers&&width-z*2>=2;z++){
        if(difficulty!==3&&random()<(z===1?.2:.5))break;
        upperStart+=Math.floor(random()*3);row(y,width-z*2,z,upperStart);
      }
    }
  }
  let solution;
  // Try unrestricted pair paths. Retry dead ends before a guaranteed row-based fallback.
  for (let attempt = 0; attempt <= 64; attempt++) {
    tiles.forEach(t => { t.removed = false; });
    solution = [];
    while (tiles.some(t => !t.removed)) {
      let a, b;
      if (attempt === 64) {
        const free=tiles.filter(t=>isFree(t,tiles));
        const options = layout==='Diamond'?free.flatMap((a,i)=>free.slice(i+1).filter(b=>a.x===b.x&&a.z===b.z&&a.y+b.y===settings.rows-1).map(b=>[a,b])):removalOptions(tiles);
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
