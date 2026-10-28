import {standardTileCount} from './standard-tiles.js';
import { deal, isFree } from './rules.js';
import {musicChoices,tileColors,validColor} from './personalization.js';
import {validRaceInterval,raceNextAt} from './race.js';
import {validScore} from './scoreboard.js';
import {seasonalSnapshot,seasonalPictureIndices,validSeasonalSnapshot} from './seasonal.js';

export const defaults = { layout: 'Random', difficulty: 1, theme: 'blue', collection: 'mixed',
  matching: 'subject', mode: 'relaxed', raceInterval:5, memoryInterval:4, available: false, captions: false,
  sound: true, music: false, musicTrack:'garden', menuMusicTrack:'moonlight', volume: .45, tileStyle: 'porcelain', tileColor:'classic', backgroundColor:'#64496e', textSize:'comfortable', playerName:'', zoom: 1 };
export const emptyStats = () => ({ played: 0, won: 0, matches: 0, best: {}, achievements: [] });
export const photoUrl = (p, original = false) => p.src || `myjong://app/photo/${p.id}/${original ? 'original' : 'tile'}?v=${p.revision || 0}`;
export function makeGame(settings, library, random = Math.random, seasonalOverride) {
  const board = deal(random, settings.layout, settings.difficulty);
  const included = library.photos.filter(p => p.included && library.subjects.some(s => s.id === p.subjectId && s.included));
  let photos;
  if (settings.matching === 'subject') {
    photos = library.subjects.filter(s => s.included).map(s => ({ name: s.name, subjectId: s.id,
      variants: included.filter(p => p.subjectId === s.id).map(p => ({ id: p.id, src: photoUrl(p) })) })).filter(p => p.variants.length);
  } else photos = included.map(p => ({ name: library.subjects.find(s => s.id === p.subjectId).name, subjectId:p.subjectId,
    variants: [{ id: p.id, src: photoUrl(p) }] }));
  photos = shuffle(photos, random).slice(0, 10);
  const seasonal=seasonalOverride?structuredClone(seasonalOverride):seasonalSnapshot(settings);
  let pool=Array.from({length:standardTileCount},(_,i)=>i);
  if(seasonal.tiles){
    const pictures=[...seasonalPictureIndices];
    pool=seasonal.mix==='all'?pictures:[...pictures,...shuffle(pool.filter(i=>!pictures.includes(i)),random).slice(0,7)];
  }
  const standard = shuffle(pool.map(i=>i+10),random);
  // Small boards can use fewer identities than the pool. Keep the recurring rabbit included.
  if(seasonal.tiles){standard.splice(standard.indexOf(44),1);standard.unshift(44);}
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
    level: settings.difficulty, puzzleSettings:Object.fromEntries(['layout','difficulty','collection','matching','mode','raceInterval','memoryInterval'].map(key=>[key,settings[key]])), photos, seasonal, history: [], elapsed: 0, hints: 0, shuffles: 0,
    mode: settings.mode, matching: settings.matching, recorded: false, started: Date.now(),initialSolution:board.solution.map(pair=>[...pair]) };
  if(settings.mode==='race')game.race={interval:settings.raceInterval||15,firstAt:Math.max(30,settings.raceInterval||15),nextAt:Math.max(30,settings.raceInterval||15),waves:0,ended:false};
  if(settings.mode==='memory')game.memory={interval:settings.memoryInterval||0,nextAt:settings.memoryInterval||0,revealed:[]};
  return game;
}
// Keep replay setup separate from preferences changed while a puzzle was in progress.
export function replaySettings(game,settings){
 const saved=game.puzzleSettings||{},next={...settings};
 next.layout=['Random','Terrace','Diamond','Butterfly','Random terraces'].includes(saved.layout)?saved.layout:game.layout;
 next.difficulty=game.level;next.matching=game.matching;next.mode=game.mode;
 next.collection=['mixed','photos','traditional'].includes(saved.collection)?saved.collection:game.photos.length?(game.tiles.some(t=>t.face>=10)?'mixed':'photos'):'traditional';
 const raceInterval=game.race?.interval??saved.raceInterval;next.raceInterval=validRaceInterval(raceInterval)?raceInterval:settings.raceInterval;
 const memoryInterval=game.memory?.interval??saved.memoryInterval;next.memoryInterval=Number.isInteger(memoryInterval)&&memoryInterval>=0&&memoryInterval<=3600?memoryInterval:settings.memoryInterval;
 if(game.seasonal){next.seasonalMode=Boolean(game.seasonal.theme);next.seasonalTiles=game.seasonal.tiles;next.seasonalBackground=game.seasonal.background;next.seasonalFaceMix=game.seasonal.mix;}
 return next;
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
export const score = game => Math.max(0, game.tiles.filter(t => t.removed).length * 50 + (game.race?.waves||0)*100 - game.hints * 15 - game.shuffles * 100);
export const betterResult=(game,best)=>!best||(game.mode==='race'
  ? game.elapsed<best.elapsed||game.elapsed===best.elapsed&&score(game)>best.score
  : score(game)>best.score||score(game)===best.score&&game.elapsed<best.elapsed);
export function validState(state) {
  if (!state || state.version !== 2 || !state.game || !state.settings || !state.stats) return false;
  const g = state.game,s=state.settings,stats=state.stats;
  if(!validSeasonalSnapshot(g.seasonal))return false;
  if(!['Random','Terrace','Diamond','Butterfly','Random terraces'].includes(s.layout)
    || ![1,2,3].includes(s.difficulty) || !['','blue','plum','sand','custom','seasonal'].includes(s.theme)
    || s.memoryInterval!==undefined&&(!Number.isInteger(s.memoryInterval)||s.memoryInterval<0||s.memoryInterval>3600)
    || s.backgroundColor!==undefined&&!validColor(s.backgroundColor)
    || s.theme==='custom'&&!validColor(s.backgroundColor)
    || s.tileColor!==undefined&&!tileColors.some(([id])=>id===s.tileColor)
    || s.musicTrack!==undefined&&!musicChoices.some(([id])=>id===s.musicTrack)
    || s.menuMusicTrack!==undefined&&!musicChoices.some(([id])=>id===s.menuMusicTrack)
    || s.textSize!==undefined&&!['standard','comfortable','large'].includes(s.textSize)
    || s.playerName!==undefined&&(typeof s.playerName!=='string'||s.playerName.length>40)
    || stats.highScores!==undefined&&(!Array.isArray(stats.highScores)||stats.highScores.length>1000||!stats.highScores.every(validScore))
    || !['mixed','photos','traditional'].includes(s.collection) || !['identical','subject'].includes(s.matching)
    || !['relaxed','challenge','race','memory'].includes(s.mode) || s.raceInterval!==undefined&&!validRaceInterval(s.raceInterval)
    || !Number.isFinite(s.volume) || s.volume<0 || s.volume>1
    || !['played','won','matches'].every(k=>Number.isInteger(stats[k]) && stats[k]>=0)
    || !Array.isArray(stats.achievements) || stats.achievements.some(a=>typeof a!=='string')
    || !stats.best || typeof stats.best!=='object')return false;
  if (!Array.isArray(g.tiles) || g.tiles.length < 2 || g.tiles.length > 300 || g.tiles.length % 2
    || !Array.isArray(g.photos) || g.photos.length > 10 || !Array.isArray(g.history) || g.history.length>(g.mode==='race'?20000:1000)
    || !Number.isFinite(g.elapsed) || g.elapsed < 0) return false;
  if(!['Relaxed','Balanced','Challenging'].includes(g.difficulty) || ![1,2,3].includes(g.level)
    || !['relaxed','challenge','race','memory'].includes(g.mode) || !['identical','subject'].includes(g.matching)
    || !Number.isInteger(g.hints) || g.hints<0 || !Number.isInteger(g.shuffles) || g.shuffles<0
    || typeof g.recorded!=='boolean')return false;
  if(g.mode==='race'&&(!g.race||!validRaceInterval(g.race.interval)||!Number.isInteger(g.race.waves)||g.race.waves<0
    || g.race.nextAt!==raceNextAt(g.race)||g.race.firstAt!==undefined&&g.race.firstAt!==Math.max(30,g.race.interval)||typeof g.race.ended!=='boolean'
    || g.race.waves!==g.history.filter(h=>h.type==='arrival').length||g.recorded&&g.race.ended))return false;
  if(g.memory!==undefined&&(g.mode!=='memory'||!Number.isInteger(g.memory.interval)||g.memory.interval<0||g.memory.interval>3600||!Number.isFinite(g.memory.nextAt)||g.memory.nextAt<0||!Array.isArray(g.memory.revealed)||new Set(g.memory.revealed).size!==g.memory.revealed.length||g.memory.revealed.some(id=>!g.tiles.some(t=>t.id===id))))return false;
  if(g.mode!=='race'&&g.race!==undefined)return false;
  if(g.photos.some(p=>typeof p.name!=='string' || !Array.isArray(p.variants) || !p.variants.length
    || p.variants.some(v=>typeof v.src!=='string' || !/^(myjong:\/\/(app\/photo\/|photo\/)|\.\/Photos\/|data:image\/)/.test(v.src))))return false;
  const ids = new Set();
  for (const t of g.tiles) {
    if (!Number.isInteger(t.id) || ids.has(t.id) || !Number.isInteger(t.face) || t.face < 0 || t.face > standardTileCount+9
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
    } else if(entry.type==='arrival') {
      if(g.mode!=='race'||!Array.isArray(entry.tiles)||entry.tiles.length!==2||entry.tiles[0].id===entry.tiles[1].id)return false;
      const current=entry.tiles.map(t=>rewind.find(c=>c.id===t.id));
      if(current.some(t=>!t||t.removed))return false;
      if(entry.swapped){
        const original=entry.swapped,tile=rewind.find(t=>t.id===original.id);
        if(!tile||tile.removed||original.removed!==false||current.some(t=>t.id===tile.id)||original.x!==tile.x||original.y!==tile.y||original.z!==tile.z||original.face!==current[1].face||tile.face!==current[0].face)return false;
        Object.assign(tile,original);
      }else if(entry.mixed===true){if(current[0].face===current[1].face)return false;}
      else if(entry.mixed!==undefined||current[0].face!==current[1].face)return false;
      for(const before of entry.tiles){
        const tile=rewind.find(t=>t.id===before.id);
        if(before.removed!==true||before.x!==tile.x||before.y!==tile.y||before.z!==tile.z
          ||!Number.isInteger(before.face)||before.face<0||before.face>standardTileCount+9||before.face<10&&!g.photos[before.face])return false;
        Object.assign(tile,before);
      }
    } else if(entry.type==='shuffle') {
      if(!Array.isArray(entry.tiles) || entry.tiles.length!==g.tiles.length)return false;
      const seen=new Set();
      for(const t of entry.tiles) {
        const current=rewind.find(c=>c.id===t.id);
        if(!current || seen.has(t.id) || t.x!==current.x || t.y!==current.y || t.z!==current.z
          || t.removed!==current.removed || !Number.isInteger(t.face) || t.face<0 || t.face>standardTileCount+9
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
