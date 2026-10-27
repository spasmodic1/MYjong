const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {_electron:electron}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
test('bundled models find people and pets without remote requests',{timeout:180000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-models-'));
  const app=await electron.launch({args:[root],env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('.tile');if(await page.locator('#splash-dialog[open]').count())await page.keyboard.press('Enter');
  page.on('console',m=>console.log('Renderer:',m.text().slice(0,200)));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const remote=[];page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  const files=[path.join(root,'node_modules/@vladmandic/face-api/demo/sample1.jpg')];
  try{const catalog=JSON.parse(await fs.readFile(path.join(root,'photo-catalog.json'),'utf8'));files.push(path.resolve(root,catalog[0].src));}catch{/* The public CI run checks people using the dependency's sample. */}
  await app.evaluate(({dialog},files)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:files});},files);
  await page.evaluate(()=>window.myjong.importPhotos());
  const results=await page.evaluate(async()=>{
    window.modelStage='importing';const engine=await import('./assets/recognition.js');window.modelStage='engine imported';
    const library=await window.myjong.library(),out=[];
    for(const [i,p] of library.photos.entries()) {
      window.modelStage='loading image '+i;const img=new Image();img.src=`myjong://app/photo/${p.id}/original`;await img.decode();window.modelStage='image loaded '+i;
      const scale=Math.min(1,1000/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=img.naturalWidth*scale;canvas.height=img.naturalHeight*scale;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const progress=stage=>{window.modelStage=stage;console.log(stage);};window.modelStage='detecting '+i;out.push(i===0?await engine.detectFaces(canvas,progress):await engine.detectPets(canvas,progress));window.modelStage='detected '+i;
    }
    return out;
  });
  console.log('Model results:',results.map(r=>r.map(d=>({kind:d.kind,score:Math.round(d.score*100),descriptor:d.descriptor?.length}))));
  assert.ok(results[0].some(r=>r.kind==='person'&&r.descriptor.length===128));
  if(results[1])assert.ok(results[1].some(r=>r.kind==='cat'||r.kind==='dog'));
  assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
});
