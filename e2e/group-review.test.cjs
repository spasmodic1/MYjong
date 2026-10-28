const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test'),{Library}=require('../desktop/library.cjs');
test('discard one group match, keep three named tiles, and resume unfinished review',{timeout:60000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-group-review-'));
 const source=path.join(dir,'group.jpg');await require('sharp')({create:{width:1600,height:800,channels:3,background:'#abc'}}).jpeg().toFile(source);
 const store=await new Library(dir).init(),result=await store.import([source]),id=result.addedIds[0];
 const root=path.resolve(__dirname,'..');
 const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe'),args:[]}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForSelector('#splash-dialog[open]');await page.keyboard.press('Enter');
 // Deterministic detections isolate the group-review workflow from model accuracy.
 const setup=async()=>page.evaluate(async id=>{
   document.querySelector('#import-review-dialog').remove();document.querySelector('#review-imports').remove();
   let library=await window.myjong.library();
   const engine={detectPets:async()=>[],detectFaces:async()=>[0,1,2,3].map(i=>({kind:'person',score:.99,box:[30+i*280,100,100,120],model:'fixture'}))};
   const {setupImportReview}=await import('./src/import-review.js');
   window.review=setupImportReview({api:window.myjong,getLibrary:()=>library,setLibrary:v=>{library=v;},refresh:()=>{},openCrop:async photo=>{library=await window.myjong.changePhoto({type:'crop',id:photo.id,crop:{x:0,y:0,zoom:2}});document.querySelector('#crop-dialog').dispatchEvent(new Event('close'));},loadRecognition:async()=>engine});
   if(!document.querySelector('#library-dialog').open)document.querySelector('#library-dialog').showModal();
   window.review.enqueue([id]);
 },id);
 await setup();await page.waitForSelector('#import-review-dialog[open]');
 await fs.mkdir(path.join(root,'Screenshots','0.9.15'),{recursive:true});await page.screenshot({path:path.join(root,'Screenshots/0.9.15/group-match-review.png'),timeout:30000});
 const confirm=async name=>{const before=await page.evaluate(()=>window.review.pending);await page.locator('#import-review-new-name').fill(name);await page.locator('#import-review-yes').click();await page.waitForFunction(before=>window.review.pending<before,before);};
 await page.locator('#import-review-adjust').click();await page.waitForFunction(()=>document.querySelector('#import-review-framing').textContent.includes('manual'));
 await confirm('First');
 await page.locator('#import-review-delete').click();
 await page.waitForFunction(()=>window.review.pending===2);
 let saved=await page.evaluate(()=>window.myjong.library());assert.equal(saved.photos.length,1);assert.equal(saved.photos[0].reviewedDetections.length,2);assert.equal(saved.photos[0].reviewPending,true);
 await page.reload();await page.waitForSelector('#splash-dialog[open]');await page.keyboard.press('Enter');await setup();
 await page.waitForSelector('#import-review-dialog[open]');assert.equal(await page.evaluate(()=>window.review.pending),2);
 await confirm('Second');await confirm('Third');await page.waitForFunction(()=>!document.querySelector('#import-review-dialog').open);
 saved=await page.evaluate(()=>window.myjong.library());assert.equal(saved.photos.length,3);assert.deepEqual(saved.subjects.map(s=>s.name),['First','Second','Third']);
 assert.ok(saved.photos.every(p=>p.subjectId&&p.included));assert.equal(saved.photos.find(p=>p.id===id).reviewPending,false);
 assert.equal(new Set(saved.photos.map(p=>JSON.stringify(p.crop))).size,3,'each accepted person has their own tile framing');
 const persisted=await new Library(dir).init();assert.equal(persisted.data.photos.length,3);await fs.access(persisted.file(id,'original'));await fs.access(source);
});
