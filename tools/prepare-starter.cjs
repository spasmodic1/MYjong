const fs=require('node:fs/promises'),JSZip=require('jszip');
(async()=>{
const zip=await JSZip.loadAsync(await fs.readFile('Private-Gift/starter.zip'));
const state=JSON.parse(await zip.file('state.json').async('string'));
state.stats={played:1,won:0,matches:0,best:{},achievements:[]};Object.assign(state.settings,{theme:'',tileStyle:'porcelain',zoom:1});
Object.assign(state.game,{elapsed:0,hints:0,shuffles:0,recorded:false,history:[],started:Date.now()});
zip.file('state.json',JSON.stringify(state));
const library=JSON.parse(await zip.file('library.json').async('string'));
library.photos.forEach((p,i)=>{const name=library.subjects.find(s=>s.id===p.subjectId)?.name||'Pet';p.name=`${name} ${i+1}.jpg`;});
zip.file('library.json',JSON.stringify(library));
await fs.writeFile('assets/starter-collection.zip',await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Prepared approved public starter collection:',library.photos.length,'photos.');
})().catch(e=>{console.error(e);process.exitCode=1;});
