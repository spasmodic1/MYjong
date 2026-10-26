import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,defaults,emptyStats,validState,score,reshuffle} from './game.js';
import {advanceRace,addRacePair} from './race.js';
import {pairs,isFree} from './rules.js';
const library={photos:[],subjects:[]};
const stateFor=game=>({version:2,settings:{...defaults,mode:'race',raceInterval:game.race.interval},stats:emptyStats(),game});
function remove(game,pair){for(const tile of pair)tile.removed=true;game.history.push({type:'match',ids:pair.map(t=>t.id)});}
test('race arrivals obey the interval, preserve score and restore safe matching pairs',()=>{
  const game=makeGame({...defaults,mode:'race',raceInterval:5,layout:'Terrace'},library);
  const initial=structuredClone(game.tiles),pair=pairs(game.tiles)[0];remove(game,pair);
  assert.equal(score(game),100);assert.deepEqual(advanceRace(game,4).added,[]);
  const result=advanceRace(game,1);assert.equal(result.added.length,2);assert.equal(result.lost,false);
  const added=result.added.map(id=>game.tiles.find(t=>t.id===id));assert.equal(added[0].face,added[1].face);
  assert.ok(added.every(t=>isFree(t,game.tiles)));assert.equal(score(game),100);assert.equal(validState(stateFor(game)),true);
  assert.equal(game.race.nextAt,10);assert.equal(game.tiles.length,initial.length);
  remove(game,added);assert.equal(score(game),200);assert.equal(validState(stateFor(game)),true);
  const before=structuredClone(game.tiles);assert.equal(reshuffle(game),true);game.history.push({type:'shuffle',tiles:before});
  assert.equal(validState(stateFor(game)),true,'arrival history remains valid across later matches and shuffles');
});
test('full boards end the race once and completed games never receive tiles',()=>{
  const game=makeGame({...defaults,mode:'race',raceInterval:5},library);
  assert.equal(advanceRace(game,5).lost,true);assert.equal(game.race.ended,true);
  const snapshot=structuredClone(game);assert.deepEqual(advanceRace(game,100),{added:[],lost:false});assert.deepEqual(game,snapshot);
  assert.equal(validState(stateFor(game)),true);
  const won=makeGame({...defaults,mode:'race'},library);won.recorded=true;const elapsed=won.elapsed;
  assert.deepEqual(advanceRace(won,100),{added:[],lost:false});assert.equal(won.elapsed,elapsed);
});
test('race saves reject broken arrival history and unsupported intervals',()=>{
  const game=makeGame({...defaults,mode:'race',raceInterval:5},library);remove(game,pairs(game.tiles)[0]);advanceRace(game,5);
  const state=stateFor(game);assert.equal(validState(state),true);
  game.history.at(-1).tiles[0].removed=false;assert.equal(validState(state),false);
  game.history.at(-1).tiles[0].removed=true;game.race.interval=0;assert.equal(validState(state),false);
});
test('incoming pairs remain supported and removable across stacked layouts',()=>{
  let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(const layout of ['Terrace','Diamond','Butterfly','Random terraces'])for(const difficulty of [1,2,3])for(let trial=0;trial<8;trial++){
    const game=makeGame({...defaults,mode:'race',layout,difficulty},library,random);
    for(let step=0;step<5;step++){const pair=pairs(game.tiles)[0];if(!pair)break;remove(game,pair);}
    const ids=addRacePair(game,random);
    assert.equal(ids.length,2);
    for(const id of ids){const tile=game.tiles.find(t=>t.id===id);assert.equal(isFree(tile,game.tiles),true);assert.ok(tile.z===0||game.tiles.some(b=>!b.removed&&b.x===tile.x&&b.y===tile.y&&b.z===tile.z-1));}
    assert.equal(validState(stateFor(game)),true);
  }
});
