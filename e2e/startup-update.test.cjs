const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test'),root=path.resolve(__dirname,'..');
test('launch update check is silent, once per process, and never downloads automatically',{timeout:45000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-startup-update-'));
 const app=await electron.launch({args:[root],env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const page=await app.firstWindow();page.setDefaultTimeout(12000);await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');
 await app.evaluate(({app,dialog},modulePath)=>{
  Object.defineProperty(app,'isPackaged',{get:()=>true,configurable:true});
  const updater=process.mainModule.require(modulePath).autoUpdater;global.testUpdater=updater;
  global.updateChecks=0;global.updateDownloads=0;global.updatePrompts=0;
  updater.checkForUpdates=async()=>{global.updateChecks++;return {isUpdateAvailable:true,updateInfo:{version:'99.0.0'}};};
  updater.downloadUpdate=async()=>{global.updateDownloads++;};
  dialog.showMessageBox=async()=>{global.updatePrompts++;return {response:1};};
 },path.join(root,'node_modules/electron-updater'));
 await page.reload();await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');await page.locator('#launch-update').waitFor({state:'visible'});
 assert.match(await page.locator('#launch-update').textContent(),/99\.0\.0/);
 assert.deepEqual(await app.evaluate(()=>({checks:global.updateChecks,downloads:global.updateDownloads,prompts:global.updatePrompts})),{checks:1,downloads:0,prompts:0});
 assert.equal(await page.locator('dialog[open]').count(),0);
 await page.reload();await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');await page.locator('#launch-update').waitFor({state:'visible'});
 assert.equal(await app.evaluate(()=>global.updateChecks),1);
 await page.locator('#launch-update').click();assert.equal(await page.locator('#settings-dialog').isVisible(),true);
 await page.locator('#update').click();await page.waitForFunction(()=>document.querySelector('#settings-message').textContent==='Update postponed.');
 assert.deepEqual(await app.evaluate(()=>({checks:global.updateChecks,downloads:global.updateDownloads,prompts:global.updatePrompts})),{checks:2,downloads:0,prompts:1});
 const controls=await app.evaluate(()=>{const u=global.testUpdater;return {download:u.autoDownload,install:u.autoInstallOnAppQuit};});
 assert.deepEqual(controls,{download:false,install:false});
});
