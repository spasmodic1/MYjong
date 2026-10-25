const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {Library}=require('../desktop/library.cjs'),{PetMatcher,rankSubjects,chooseSuggestion}=require('../desktop/pet-matcher.cjs');
(async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-pet-evaluation-'));try{
  const library=await new Library(dir).init();await library.restore(path.resolve('assets/starter-collection.zip'));
  const matcher=new PetMatcher(library,path.resolve('assets')),references=[];
  for(const photo of library.data.photos){const subject=library.data.subjects.find(s=>s.id===photo.subjectId),animals=(photo.analysis||[]).filter(d=>d.kind!=='person');
    if(animals.length>1)continue;
    const vector=await matcher.embedding(photo,animals[0]?.box);references.push({id:photo.id,subjectId:subject.id,name:subject.name,vector});
  }
  const results=references.map(p=>{const ranked=rankSubjects(p.vector,references.filter(r=>r.id!==p.id)),suggestion=chooseSuggestion(ranked);return {expected:p.name,nearest:ranked[0]?.name,similarity:+ranked[0]?.score.toFixed(3),margin:+(ranked[0].score-ranked[1].score).toFixed(3),suggested:suggestion?.name||null};});
  console.log(JSON.stringify(results,null,2));
  await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/pet-matching-evaluation.json',JSON.stringify(results,null,2));
  await fs.writeFile('assets/pet-reference-embeddings.json',JSON.stringify(matcher.cache));
  console.log('Held-out photos:',results.length,'nearest correct:',results.filter(r=>r.expected===r.nearest).length,'suggestions:',results.filter(r=>r.suggested).length,'incorrect suggestions:',results.filter(r=>r.suggested&&r.suggested!==r.expected).length);
}finally{await fs.rm(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
