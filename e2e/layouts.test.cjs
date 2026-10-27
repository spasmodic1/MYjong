const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test'),{Library}=require('../desktop/library.cjs');const root=path.resolve(__dirname,'..');
test('named layouts have distinct visible boards and a quick dealing animation',{timeout:90000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-layouts-')),library=await new Library(dir).init();await library.restore(path.join(root,'assets/starter-collection.zip'));
  const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe'),args:[]}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('.tile');if(await page.locator('#splash-dialog[open]').count())await page.keyboard.press('Enter');
  await page.evaluate(()=>{window.deals=0;const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(options.duration===230)window.deals++;return animate.call(this,frames,options);};});
  const screenshots=path.join(root,'Screenshots/0.9.4',`review-${Date.now()}`);await fs.mkdir(screenshots,{recursive:true});const counts=[];
  for(const layout of ['Terrace','Diamond','Butterfly']){
    await page.locator('#new').click();await page.locator('#layout').selectOption(layout);await page.locator('#difficulty').selectOption('2');await page.locator('#mode').selectOption('relaxed');
    await page.getByRole('button',{name:'Start puzzle',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#new-dialog').open);
    await page.waitForFunction(()=>document.querySelector('#board').getAttribute('aria-busy')==='false');
    counts.push(await page.locator('.tile').count());await page.waitForFunction(()=>[...document.querySelectorAll('.tile-photo')].every(img=>img.naturalWidth>0));
    await page.screenshot({path:path.join(screenshots,layout.toLowerCase()+'.png')});
  }
  assert.deepEqual(counts,[80,58,72]);assert.ok(await page.evaluate(()=>window.deals>=210));console.log('Layout screenshots:',screenshots);
});
