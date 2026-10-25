import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFree, deal, layoutNames, difficulties } from './rules.js';

test('tiles require an open side and no overlapping tile above', () => {
  const row = [0, 1, 2].map(x => ({ id: x, x, y: 0, z: 0 }));
  assert.equal(isFree(row[1], row), false);
  assert.equal(isFree(row[0], row), true);
  const upper = { id: 3, x: 0.5, y: 0, z: 1 };
  assert.equal(isFree(row[0], [...row, upper]), false);
  row[0].removed = true;
  assert.equal(isFree(row[1], row), true);
});

test('generated deals can be cleared along their construction path', () => {
  for (const difficulty of [1,2,3]) for (const layout of ['Random', ...layoutNames]) for (let seed = 1; seed <= 100; seed++) {
    let state = seed;
    const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    const board = deal(random, layout, difficulty);
    assert.equal(board.difficulty, difficulties[difficulty].name);
    assert.ok(board.every(t => t.z < difficulties[difficulty].layers && t.y < difficulties[difficulty].rows));
    assert.equal(new Set(board.map(t => `${t.x},${t.y},${t.z}`)).size, board.length);
    assert.ok(board.some(t => t.face < 10) && board.some(t => t.face >= 10));
    assert.ok(board.solution.some(([a,b]) => board[a].y !== board[b].y));
    for (const [aId, bId] of board.solution) {
      const a = board[aId], b = board[bId];
      assert.ok(isFree(a, board) && isFree(b, board));
      assert.equal(a.face, b.face);
      a.removed = b.removed = true;
    }
    assert.ok(board.every(t => t.removed));
  }
});

test('difficulty increases board size and stacking while retaining both tile types', () => {
  const boards = [1,2,3].map(level => deal(() => .75, 'Terrace', level));
  assert.ok(boards[0].length < boards[1].length && boards[1].length < boards[2].length);
  assert.deepEqual(boards.map(b => Math.max(...b.map(t => t.z))), [0,2,3]);
  assert.throws(() => deal(Math.random, 'Terrace', 0), /Unknown difficulty/);
});

test('procedural boards vary their geometry', () => {
  const boards = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    let state = seed;
    const board = deal(() => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296), 'Random terraces');
    boards.add(JSON.stringify(board.map(({ x,y,z }) => [x,y,z])));
  }
  assert.ok(boards.size > 10);
});

test('random terraces include off-center rows and fully supported upper tiles', () => {
  let state = 725;
  const board = deal(() => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296), 'Random terraces');
  assert.ok(Array.from({length:6}, (_,y) => board.filter(t => t.y === y && t.z === 0)).some(row => Math.min(...row.map(t => t.x)) + Math.max(...row.map(t => t.x)) !== 7));
  for (const tile of board.filter(t => t.z > 0)) {
    assert.ok(board.some(t => t.x === tile.x && t.y === tile.y && t.z === tile.z - 1));
  }
});
