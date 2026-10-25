const {test}=require('node:test'),assert=require('node:assert/strict');
const {rankSubjects,chooseSuggestion}=require('./pet-matcher.cjs');
test('appearance suggestions rank distinct identities and do not turn similarity into certainty',()=>{
  const refs=[{id:'a1',subjectId:'a',name:'Marley',vector:[1,0]},{id:'a2',subjectId:'a',name:'Marley',vector:[.9,.1]},{id:'b',subjectId:'b',name:'Other pet',vector:[0,1]}];
  const ranked=rankSubjects([1,0],refs);assert.equal(ranked.length,2);assert.equal(chooseSuggestion(ranked).name,'Marley');
  assert.equal(chooseSuggestion([{...ranked[0],score:.4},ranked[1]]),null);
  assert.equal(chooseSuggestion([{...ranked[0],score:.8},{...ranked[1],score:.79}]),null);
  assert.equal(chooseSuggestion([]),null);
});
