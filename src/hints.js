import { pairs } from './rules.js';

export function createHintCycle(random = Math.random) {
  let previousBoard, previousState, queue = [], lastKey;
  const key = pair => pair.map(t => t.id).sort((a, b) => a - b).join(',');
  return tiles => {
    const state = tiles.map(t => `${t.id}:${t.face}:${Boolean(t.removed)}`).join('|');
    if (tiles !== previousBoard || state !== previousState) {
      previousBoard = tiles;
      previousState = state;
      queue = [];
      lastKey = undefined;
    }
    if (!queue.length) {
      queue = pairs(tiles);
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      // Avoid repeating the last hint across shuffle boundaries.
      if (queue.length > 1 && key(queue[queue.length - 1]) === lastKey) {
        [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
      }
    }
    const pair = queue.pop() || [];
    lastKey = key(pair);
    return pair;
  };
}
