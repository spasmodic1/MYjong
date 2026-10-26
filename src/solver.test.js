import test from 'node:test';
import assert from 'node:assert/strict';
import {solveBoard,analyzeDeadEnd} from './solver.js';
import {isFree} from './rules.js';
const fixture=()=>({tiles:[
  {id:0,x:0,y:0,z:0,face:10,removed:false},{id:1,x:0,y:0,z:1,face:10,removed:false},
  {id:2,x:2,y:0,z:0,face:10,removed:false},{id:3,x:4,y:0,z:0,face:10,removed:false},
  {id:4,x:6,y:0,z:0,face:11,removed:false},{id:5,x:7,y:0,z:0,face:11,removed:false}],history:[],initialSolution:[[4,5],[1,2],[0,3]]});
function match(game,ids){ids.forEach(id=>game.tiles[id].removed=true);game.history.push({type:'match',ids});}
test('exact solver distinguishes a blocked pair from a solvable choice',()=>{
  const game=fixture(),result=solveBoard(game.tiles);assert.equal(result.status,'solvable');
  for(const ids of result.path){assert.ok(ids.every(id=>isFree(game.tiles[id],game.tiles)));ids.forEach(id=>game.tiles[id].removed=true);}
  assert.ok(game.tiles.every(t=>t.removed));
  const lost=fixture();match(lost,[2,3]);match(lost,[4,5]);assert.equal(solveBoard(lost.tiles).status,'unsolvable');
});
test('rollback finds the first losing move and retains earlier safe matches',()=>{
  const game=fixture();match(game,[4,5]);match(game,[2,3]);
  const plan=analyzeDeadEnd(game);assert.equal(plan.exact,true);assert.equal(plan.move,2);assert.equal(plan.rollbackAt,1);
  assert.equal(plan.tiles[4].removed,true);assert.equal(plan.tiles[2].removed,false);assert.equal(solveBoard(plan.tiles).status,'solvable');
});
test('search limits never become false claims of unsolvability or an exact losing move',()=>{
  const game=fixture();assert.equal(solveBoard(game.tiles,{maxNodes:0}).status,'unknown');
  match(game,[2,3]);match(game,[4,5]);const plan=analyzeDeadEnd(game,{maxNodes:0});
  assert.equal(plan.exact,false);assert.equal(plan.rollbackAt,0);assert.equal(solveBoard(plan.tiles).status,'solvable');
});
