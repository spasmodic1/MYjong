import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, defaults, reshuffle, validState, emptyStats } from './game.js';
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
