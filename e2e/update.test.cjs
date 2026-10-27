const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
test('an older packaged build downloads the public GitHub update without altering its library',{timeout:240000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-update-'));
  const app=await electron.launch({executablePath:path.join(root,'test-results/update-old/win-unpacked/MYjong.exe'),args:[],env:{...process.env,MYJONG_TEST_DATA:path.join(dir,'data'),MYJONG_SMOKE:'1',LOCALAPPDATA:path.join(dir,'cache')}});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('.tile');if(await page.locator('#splash-dialog[open]').count())await page.keyboard.press('Enter');
  await page.locator('#settings').click();
  const before=await page.evaluate(()=>window.myjong.load());assert.equal(before.version,'0.8.9');
  await app.evaluate(({dialog})=>{global.updateDialogs=[];dialog.showMessageBox=async(_window,options)=>{global.updateDialogs.push(options.message);return {response:options.buttons[0]==='Download update'?0:1};};});
  const result=await page.evaluate(()=>window.myjong.update());
  assert.match(result,/Update downloaded/);
  const after=await page.evaluate(()=>window.myjong.load());assert.deepEqual(after.library,before.library);assert.deepEqual(after.state.game.tiles,before.state.game.tiles);
  const dialogs=await app.evaluate(()=>global.updateDialogs);assert.equal(dialogs.length,2);assert.ok(dialogs[0].includes(require('../package.json').version));assert.match(dialogs[1],/ready/);
  console.log('Verified GitHub release check, checksum-verified download, restart prompt, and intact photos/save.');
});
