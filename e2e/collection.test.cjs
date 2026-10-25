const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),sharp=require('sharp');
const {_electron:electron}=require('@playwright/test');
const {Library}=require('../desktop/library.cjs');
const root=path.resolve(__dirname,'..');
test('collection reopens with all existing photos after a filtered import or naming',{timeout:90000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-collection-')),data=path.join(dir,'data');let app;
  t.after(async()=>{await app?.close();await fs.rm(dir,{recursive:true,force:true});});
  const lib=await new Library(data).init();await lib.restore(path.join(root,'assets/starter-collection.zip'));
  const originalIds=lib.data.photos.map(p=>p.id),subject=lib.data.subjects[0].id;
  const file=path.join(dir,'new-photo.png');await sharp({create:{width:600,height:400,channels:3,background:'#b8a8b8'}}).png().toFile(file);
  app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe'),args:[]}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:data,MYJONG_SMOKE:'1'}});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('.tile');
  await page.locator('#photos').click();assert.equal(await page.locator('.photo-card').count(),21);
  assert.equal(await page.locator('#subject-filter option[value="unassigned"]').evaluate(option=>option.disabled),true);
  // A stale pre-fix selection must also recover when the collection is reopened.
  await page.locator('#subject-filter').evaluate(select=>{select.value='unassigned';});
  await page.locator('#library-dialog [data-close]').click();await page.locator('#photos').click();
  assert.equal(await page.locator('#subject-filter').inputValue(),'all');assert.equal(await page.locator('.photo-card').count(),21);
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.locator('#import-files').click();await page.waitForFunction(()=>document.querySelectorAll('.photo-card').length===22);
  assert.equal(await page.locator('#subject-filter option[value="unassigned"]').evaluate(option=>option.disabled),false);
  await page.locator('#subject-filter').selectOption('unassigned');
  assert.equal(await page.locator('.photo-card').count(),1);assert.match(await page.locator('#library-count').textContent(),/Showing 1 of 22/);
  await page.locator('.photo-card select').selectOption(subject);await page.waitForFunction(()=>document.querySelectorAll('.photo-card').length===22);
  assert.equal(await page.locator('#subject-filter option[value="unassigned"]').evaluate(option=>option.disabled),true);
  assert.equal(await page.locator('#subject-filter').inputValue(),'all');
  await page.locator('#subject-filter').selectOption(subject);
  await page.locator('#library-dialog [data-close]').click();await page.locator('#photos').click();
  assert.equal(await page.locator('#subject-filter').inputValue(),'all');assert.equal(await page.locator('.photo-card').count(),22);
  const after=await page.evaluate(()=>window.myjong.library());assert.ok(originalIds.every(id=>after.photos.some(p=>p.id===id)));
  for(const id of originalIds){await fs.stat(lib.file(id,'original'));await fs.stat(lib.file(id,'tile'));}
  await fs.mkdir(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/collection-all-photos.png')});
});
