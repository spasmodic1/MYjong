const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const sharp=require('sharp'),{_electron:electron}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
test('phone QR dismisses on receipt without interrupting the selected batch',{timeout:90000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-phone-batch-'));
  const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe'),args:[]}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const page=await app.firstWindow();page.setDefaultTimeout(30000);await page.waitForSelector('.tile');if(await page.locator('#splash-dialog[open]').count())await page.keyboard.press('Enter');
  await page.locator('#photos').click();await page.locator('#import-phone').click();
  await page.waitForSelector('#phone-dialog[open]');
  const url=new URL(await page.locator('#phone-url').textContent());url.hostname='127.0.0.1';url.pathname='/upload';
  const before=await page.evaluate(()=>window.myjong.library());
  for(const [index,color] of ['#1188aa','#aa8811'].entries()){
    const body=await sharp({create:{width:400,height:500,channels:3,background:color}}).jpeg().toBuffer();
    url.searchParams.set('name',`phone-${index}.jpg`);
    assert.equal((await fetch(url,{method:'POST',body})).status,200);
    await page.waitForFunction(count=>document.querySelectorAll('.photo-card').length===count,before.photos.length+index+1);
    await page.waitForFunction(()=>!document.querySelector('#phone-dialog').open);
  }
  assert.equal(await page.locator('#library-dialog').evaluate(d=>d.open),true);
  const after=await page.evaluate(()=>window.myjong.library());assert.equal(after.photos.length,before.photos.length+2);
  // Explicit dismissal of a fresh session still stops its server.
  await page.locator('#import-phone').click();await page.waitForSelector('#phone-dialog[open]');
  const fresh=new URL(await page.locator('#phone-url').textContent());fresh.hostname='127.0.0.1';
  await page.locator('#phone-dialog [data-close]').click();
  await assert.rejects(async()=>{
    for(let i=0;i<10;i++){
      await new Promise(resolve=>setTimeout(resolve,50));
      await fetch(fresh,{signal:AbortSignal.timeout(1000)});
    }
  });
});
