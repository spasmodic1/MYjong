import test from 'node:test';
import assert from 'node:assert/strict';
import { deal, pairs } from './rules.js';
import { readSave, writeSave, saveKey } from './storage.js';

const memory = () => {
  const values = new Map();
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
};
const state = () => ({ tiles: deal(Math.random, 'Terrace', 1), history: [],
  photos: [{ name: 'Pet', src: './Photos/pet.jpg' }], theme: 'plum',
  nextLayout: 'Diamond', nextDifficulty: 3 });

test('save restores board, undo history, photos and next-game preferences', () => {
  const storage = memory(), game = state();
  const match = pairs(game.tiles)[0];
  match.forEach(t => { t.removed = true; });
  game.history.push(match.map(t => t.id));
  assert.equal(writeSave(storage, game), true);
  const restored = readSave(storage);
  assert.deepEqual(restored.tiles, game.tiles);
  assert.equal(restored.tiles.layout, 'Terrace');
  assert.equal(restored.tiles.difficulty, 'Relaxed');
  for (const key of ['history', 'photos', 'theme', 'nextLayout', 'nextDifficulty']) {
    assert.deepEqual(restored[key], game[key]);
  }
  restored.history.pop().forEach(id => { restored.tiles.find(t => t.id === id).removed = false; });
  assert.equal(restored.tiles.filter(t => t.removed).length, 0);
});

test('missing, corrupt, unsupported and inconsistent saves are ignored', () => {
  const storage = memory();
  assert.equal(readSave(storage), null);
  storage.setItem(saveKey, '{broken');
  assert.equal(readSave(storage), null);
  for (const corrupt of [s => { s.version = 2; }, s => { s.tiles[1].id = s.tiles[0].id; },
    s => { s.history = [[999, 1000]]; }, s => { s.tiles[0].removed = true; },
    s => { s.photos[0].src = 'https://example.com/photo.jpg'; }]) {
    writeSave(storage, state());
    const data = JSON.parse(storage.getItem(saveKey));
    corrupt(data);
    storage.setItem(saveKey, JSON.stringify(data));
    assert.equal(readSave(storage), null);
  }
});

test('unavailable storage does not throw or claim a successful save', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } };
  assert.equal(writeSave(blocked, state()), false);
  assert.equal(readSave(blocked), null);
});
