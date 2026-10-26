import test from 'node:test';
import assert from 'node:assert/strict';
import {rankScores,cleanPlayerName,validScore} from './scoreboard.js';
test('scoreboard compares like boards and distinguishes race speed from challenge points',()=>{
  const base={id:'a',name:'Mom',category:'Challenge board',mode:'challenge',score:100,elapsed:20,created:1};
  const records=[base,{...base,id:'b',score:200,elapsed:30},{...base,id:'c',category:'Other board',score:9999}];
  assert.equal(rankScores(records,'Challenge board')[0].id,'b');
  assert.equal(rankScores(records.map(r=>({...r,mode:'race'})),'Challenge board')[0].id,'a');
  assert.equal(cleanPlayerName('  Mom   Smith  '),'Mom Smith');assert.equal(cleanPlayerName('x'.repeat(80)).length,40);
  assert.equal(validScore(base),true);assert.equal(validScore({...base,score:NaN}),false);
});
