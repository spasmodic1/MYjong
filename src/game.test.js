import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, replaySettings, defaults, reshuffle, validState, emptyStats, betterResult, score } from './game.js';
import { pairs, isFree } from './rules.js';
const library = { subjects: [{ id:'a', name:'Cat', included:true },{ id:'b', name:'Dog', included:false }], photos: [
  { id:'1',subjectId:'a',included:true,src:'./Photos/a.jpg' },{ id:'2',subjectId:'a',included:true,src:'./Photos/b.jpg' },
  { id:'3',subjectId:'b',included:true,src:'./Photos/c.jpg' }] };
test('photo matching modes preserve identities and respect exclusions', () => {
  for (const matching of ['identical','subject']) {
    const g = makeGame({ ...defaults, matching, collection:'photos' },library);
    assert.ok(g.tiles.every(t => t.face < 10));
    assert.equal(g.photos.length,matching === 'subject' ? 1 : 2);
    assert.ok(g.photos.every(p => p.name === 'Cat'));
    assert.equal(g.photos[0].variants.length,matching === 'subject' ? 2 : 1);
  }
  const traditional = makeGame({...defaults,collection:'traditional'},library);
  assert.ok(traditional.tiles.every(t => t.face >= 10));
  const mixed=makeGame({...defaults,difficulty:1,layout:'Terrace'},library);
  assert.equal(mixed.tiles.filter(t=>t.face<10).length,mixed.tiles.length/2);
});
test('shuffle preserves remaining face counts and yields a removable arrangement', () => {
  const g = makeGame({...defaults,difficulty:1},library);
  const match = pairs(g.tiles)[0]; match.forEach(t => { t.removed=true; });
  const removed = g.tiles.filter(t=>t.removed).map(t=>t.id);
  const before = g.tiles.filter(t=>!t.removed).map(t=>t.face).sort();
  assert.equal(reshuffle(g),true);
  assert.deepEqual(g.tiles.filter(t=>t.removed).map(t=>t.id),removed);
  assert.deepEqual(g.tiles.filter(t=>!t.removed).map(t=>t.face).sort(),before);
  // Exhaustively find a solution on the small shuffled board.
  function solve(tiles) {
    if (tiles.every(t=>t.removed)) return true;
    for (const [a,b] of pairs(tiles)) {
      a.removed=b.removed=true;
      if (solve(tiles)) return true;
      a.removed=b.removed=false;
    }
    return false;
  }
  assert.ok(solve(g.tiles));
});
test('saved games reject invalid tile identities and coordinates', () => {
  const state = { version:2, settings:{...defaults}, stats:emptyStats(),game:makeGame(defaults,library) };
  assert.equal(validState(state),true);
  state.game.tiles[0].x=NaN; assert.equal(validState(state),false);
});
test('custom appearance saves validate while older settings remain compatible',()=>{
  const state={version:2,settings:{...defaults,theme:'custom',backgroundColor:'#f1e2ca',tileColor:'lavender',musicTrack:'starlight'},stats:emptyStats(),game:makeGame(defaults,library)};
  assert.equal(validState(state),true);
  state.settings.backgroundColor='url(invalid)';assert.equal(validState(state),false);
  state.settings.backgroundColor='#ffffff';state.settings.musicTrack='invalid';assert.equal(validState(state),false);
  state.settings.musicTrack='garden';state.settings.tileColor='invalid';assert.equal(validState(state),false);
  state.settings.theme='';for(const key of ['musicTrack','tileColor','backgroundColor'])delete state.settings[key];
  assert.equal(validState(state),true,'pre-personalization saves remain valid');
});
test('challenge ranks points, while race ranks speed so extra arrivals cannot farm records',()=>{
  const g=makeGame({...defaults,mode:'challenge'},library);g.tiles[0].removed=g.tiles[1].removed=true;g.elapsed=20;
  assert.equal(betterResult(g,{score:score(g),elapsed:25}),true);
  assert.equal(betterResult(g,{score:score(g)+1,elapsed:25}),false);
  g.mode='race';assert.equal(betterResult(g,{score:score(g)+1000,elapsed:25}),true);
  assert.equal(betterResult(g,{score:0,elapsed:10}),false);
});

test('red rabbit is part of the default traditional pool and survives save and shuffle',()=>{
 const settings={...defaults,collection:'traditional',layout:'Terrace',difficulty:3,seasonalMode:false};
 const game=makeGame(settings,library,()=>.9999),state={version:2,settings,stats:emptyStats(),game};
 assert.ok(game.tiles.some(t=>t.face===44));assert.equal(validState(state),true);
 assert.equal(reshuffle(game,()=>.5),true);assert.ok(game.tiles.some(t=>t.face===44));assert.equal(validState(state),true);
 const bad=structuredClone(state);bad.game.tiles[0].face=45;assert.equal(validState(bad),false);
});

test('play again restores the completed setup and starts fresh, including seasonal and timed modes',()=>{
 for(const mode of ['challenge','race','memory']){
  const original={...defaults,layout:'Random',difficulty:2,collection:'traditional',matching:'identical',mode,raceInterval:8,memoryInterval:7,seasonalMode:true};
  const finished=makeGame(original,library);finished.recorded=true;finished.elapsed=180;finished.hints=4;finished.shuffles=2;
  const seasonal=structuredClone(finished.seasonal),queued={...original,layout:'Terrace',difficulty:3,collection:'photos',matching:'subject',mode:'relaxed',seasonalMode:false,raceInterval:30,memoryInterval:90};
  const next=replaySettings(finished,queued),fresh=makeGame(next,library,Math.random,finished.seasonal);
  assert.equal(next.layout,'Random');assert.equal(next.collection,'traditional');assert.equal(fresh.level,2);assert.equal(fresh.mode,mode);assert.equal(fresh.matching,'identical');
  assert.deepEqual(fresh.seasonal,seasonal);assert.notEqual(fresh.seasonal,finished.seasonal);assert.equal(fresh.elapsed,0);assert.equal(fresh.recorded,false);assert.equal(fresh.hints,0);assert.equal(fresh.shuffles,0);assert.deepEqual(fresh.history,[]);assert.ok(fresh.tiles.every(t=>!t.removed));
  if(mode==='race'){assert.equal(fresh.race.interval,8);assert.equal(fresh.race.waves,0);}
  if(mode==='memory'){assert.equal(fresh.memory.interval,7);assert.deepEqual(fresh.memory.revealed,[]);}
  delete finished.puzzleSettings;assert.equal(replaySettings(finished,queued).layout,finished.layout);
 }
});
