import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGame,defaults,emptyStats,validState} from './game.js';
import {revealMemoryTile} from './memory.js';
import {isFree} from './rules.js';
test('memory timer reveals only available hidden tiles, persists and supports zero',()=>{
 const settings={...defaults,mode:'memory',memoryInterval:5},game=makeGame(settings,{photos:[],subjects:[]});
 assert.equal(revealMemoryTile(game),null);game.elapsed=5;
 const id=revealMemoryTile(game,null,()=>0);assert.ok(isFree(game.tiles.find(t=>t.id===id),game.tiles));
 assert.equal(revealMemoryTile(game),null);game.elapsed=10;
 assert.notEqual(revealMemoryTile(game,null,()=>0),id);
 const state=JSON.parse(JSON.stringify({version:2,settings,stats:emptyStats(),game}));assert.equal(validState(state),true);assert.deepEqual(state.game.memory.revealed,game.memory.revealed);
 game.memory.interval=0;game.elapsed=999;assert.equal(revealMemoryTile(game),null);
 state.game.memory.revealed.push(99999);assert.equal(validState(state),false);
});
