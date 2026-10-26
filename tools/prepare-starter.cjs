const fs=require('node:fs/promises'),JSZip=require('jszip');
(async()=>{
const zip=await JSZip.loadAsync(await fs.readFile('Private-Gift/starter.zip'));
// Seed photos only; a fresh game should use the current defaults.
zip.remove('state.json');
const library=JSON.parse(await zip.file('library.json').async('string'));
library.photos.forEach((p,i)=>{const name=library.subjects.find(s=>s.id===p.subjectId)?.name||'Pet';p.name=`${name} ${i+1}.jpg`;});
zip.file('library.json',JSON.stringify(library));
await fs.writeFile('assets/starter-collection.zip',await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Prepared approved public starter collection:',library.photos.length,'photos.');
})().catch(e=>{console.error(e);process.exitCode=1;});
