import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedCrop,groupDetections,distinctSubjects,personMatch} from './photo-analysis.js';
test('person suggestions tolerate pose changes but reject distant and ambiguous names',()=>{
  const ref=(id,distance)=>({subject:{id,name:id},photo:{id:`photo-${id}`},distance});
  assert.equal(personMatch([ref('A',.577)]).subjectId,'A');
  assert.equal(personMatch([ref('A',.61)]),null);
  assert.equal(personMatch([ref('A',.52),ref('B',.55)]),null);
  assert.equal(personMatch([ref('A',.52),ref('A',.53),ref('B',.64)]).subjectId,'A');
  assert.equal(personMatch([]),null);
});
test('crop suggestions include the detected subject and use full photo for wide groups',()=>{
  const crop=suggestedCrop([300,200,100,100],1000,800,'person');
  assert.ok(crop && crop.zoom>=1 && crop.zoom<=5);
  const width=Math.min(1000,800*.8)/crop.zoom,height=width/.8,left=(1000-width)*crop.x,top=(800-height)*crop.y;
  assert.ok(left<=300 && left+width>=400 && top<=200 && top+height>=300);
  assert.equal(suggestedCrop([0,0,950,500],1000,800,'cat'),null);
});
test('duplicate animal classes and pet-face false positives do not create extra subjects',()=>{
  const dog={kind:'dog',score:.95,box:[100,100,200,300]},duplicate={kind:'horse',score:.6,box:[105,105,195,295]};
  const petFace={kind:'person',score:.6,box:[120,110,70,70]},person={kind:'person',score:.9,box:[500,20,80,80]};
  assert.deepEqual(distinctSubjects([dog,duplicate],[petFace,person]),[dog,person]);
});
test('person groups require similar descriptors; pets are never grouped by species',()=>{
  const descriptor=new Array(128).fill(0);
  const groups=groupDetections([{kind:'person',descriptor},{kind:'person',descriptor:[...descriptor]},{kind:'person',descriptor:new Array(128).fill(1)},{kind:'cat'},{kind:'cat'}]);
  assert.equal(groups.length,4);assert.equal(groups[0].items.length,2);
});
