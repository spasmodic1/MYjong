const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test'),root=path.resolve(__dirname,'..');
test('seasonal audio stays with the current puzzle and stops when a default puzzle starts',{timeout:90000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-seasonal-audio-'));
 const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe'),args:[]}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true));
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});window.testPlayers=[];const Native=Audio;
  window.Audio=class extends Native{constructor(...args){super(...args);window.testPlayers.push(this);}};
  const RealDate=Date;window.testMonth=9;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,window.testMonth,15,12]));}};
 });
 const start=async mode=>{await page.locator('#new').click();await page.locator('#collection').selectOption('traditional');await page.locator('#puzzleTheme').selectOption(mode);await page.getByRole('button',{name:'Start puzzle',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#board').getAttribute('aria-busy')==='false');};
 const playing=track=>page.waitForFunction(track=>window.testPlayers.some(p=>p.src.endsWith('/'+track+'.ogg')&&!p.paused&&p.currentTime>0&&p.readyState>=2),track);
 await start('seasonal');await page.locator('#settings').click();await page.locator('#music').check();await page.locator('#musicTrack').selectOption('garden');await page.locator('#settings-dialog [data-close]').click();await playing('halloween-waltz');
 await page.locator('#seasonal-toggle').click();assert.match(await page.locator('#seasonal-toggle').innerText(),/Switch to Seasonal/);assert.equal(await page.locator('body').getAttribute('data-season'),'halloween');await playing('halloween-waltz');
 await start('default');await playing('garden');await page.waitForFunction(()=>window.testPlayers.filter(p=>!p.src.endsWith('/garden.ogg')).every(p=>p.paused&&p.volume===0));assert.equal(await page.locator('body').getAttribute('data-season'),'');
 await page.evaluate(()=>{window.testMonth=11;});await start('seasonal');await playing('christmas-bells');await page.waitForFunction(()=>window.testPlayers.filter(p=>!p.src.endsWith('/christmas-bells.ogg')).every(p=>p.paused&&p.volume===0));
 const state=await page.evaluate(()=>window.myjong.load());assert.ok(state.state.game.tiles.some(t=>t.face===44));assert.equal(state.state.game.seasonal.theme,'christmas');
});
