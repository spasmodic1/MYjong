import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHintCycle } from './hints.js';

const board = () => Array.from({ length: 6 }, (_, id) => ({ id, x: 0, y: id, z: 0, face: Math.floor(id / 2), removed: false }));
const key = pair => pair.map(t => t.id).sort().join(',');

test('hints visit every match in shuffled order without boundary repeats', () => {
  const tiles = board(), next = createHintCycle(() => .5);
  const first = Array.from({ length: 3 }, () => key(next(tiles)));
  assert.equal(new Set(first).size, 3);
  assert.notEqual(first[0], '0,1');
  const following = key(next(tiles));
  assert.notEqual(following, first[2]);
});

test('board changes invalidate queued hints, including undo and new games', () => {
  const tiles = board(), next = createHintCycle(() => .99);
  next(tiles);
  tiles[0].removed = tiles[1].removed = tiles[2].removed = tiles[3].removed = true;
  assert.equal(key(next(tiles)), '4,5');
  assert.equal(key(next(tiles)), '4,5');
  tiles[4].removed = tiles[5].removed = true;
  assert.deepEqual(next(tiles), []);
  tiles[0].removed = tiles[1].removed = false;
  assert.equal(key(next(tiles)), '0,1');
  const fresh = board();
  assert.ok(next(fresh).every(t => fresh.includes(t)));
});
