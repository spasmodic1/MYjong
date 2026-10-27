const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test'),{Library}=require('../desktop/library.cjs');
const root=path.resolve(__dirname,'..');
test('personalization previews, plays each tune and preserves choices and puzzle on reload',{timeout:90000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-personalization-'));
  const library=await new Library(dir).init();await library.restore(path.join(root,'assets/starter-collection.zip'));
  const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe'),args:[]}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
  t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true));
  const before=await page.evaluate(()=>window.myjong.load());
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});
    window.testPlayers=[];const Native=window.Audio;
    window.Audio=class extends Native{constructor(...args){super(...args);window.testPlayers.push(this);}};
  });
  await page.locator('#settings').click();await page.locator('#seasonal-heading').click();await page.locator('#seasonalMusic').uncheck();await page.locator('#theme').selectOption('custom');
  const comfortable=await page.locator('nav .quiet').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  await page.locator('#textSize').selectOption('large');
  assert.ok(await page.locator('nav .quiet').first().evaluate((el,before)=>parseFloat(getComputedStyle(el).fontSize)>before,comfortable));
  await page.locator('#backgroundColor').evaluate(input=>{input.value='#e9d7b8';input.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(233, 215, 184)');
  assert.equal(await page.locator('#status').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 0)');
  const gradients=new Set();
  for(const color of ['classic','jade','sky','rose','lavender']){
    await page.locator('#tileColor').selectOption(color);
    gradients.add(await page.locator('.tile').first().evaluate(el=>getComputedStyle(el).backgroundImage));
  }
  assert.equal(gradients.size,5);
  await page.locator('#music').check();
  for(const track of ['garden','river','moonlight','sunroom','starlight','welcome']){
    await page.locator('#menuMusicTrack').selectOption(track);
    await page.waitForFunction(track=>window.testPlayers.some(p=>p.src.endsWith('/'+track+'.ogg')&&!p.paused&&p.readyState>=2&&p.duration>60),track).catch(async error=>{
      console.log('Track playback check:',track,await page.evaluate(()=>window.testPlayers.map(p=>({src:p.src,paused:p.paused,ready:p.readyState,duration:p.duration,error:p.error?.message}))));throw error;
    });
  }
  await page.evaluate(()=>{const p=window.testPlayers.find(p=>p.src.endsWith('/welcome.ogg'));p.currentTime=p.duration-.25;});
  await page.waitForFunction(()=>window.testPlayers.some(p=>p.src.endsWith('/welcome.ogg')&&!p.paused&&p.currentTime<1),null,{timeout:5000});
  await page.locator('#musicTrack').selectOption('starlight');
  const screenshots=path.join(root,'Screenshots/0.9.4',`review-${Date.now()}`);await fs.mkdir(screenshots,{recursive:true});
  await page.screenshot({path:path.join(screenshots,'settings-custom-colors.png')});
  await page.locator('#settings-dialog [data-close]').click();
  await page.waitForFunction(()=>window.testPlayers.some(p=>p.src.endsWith('/starlight.ogg')&&!p.paused));
  await page.waitForFunction(()=>[...document.querySelectorAll('.tile-photo')].every(img=>img.naturalWidth>0));
  await page.screenshot({path:path.join(screenshots,'custom-background-lavender.png')});
  await page.waitForFunction(async()=>{const {state}=await window.myjong.load();return state.settings.musicTrack==='starlight'&&state.settings.tileColor==='lavender';});
  await page.reload();await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');
  const after=await page.evaluate(()=>window.myjong.load());
  assert.deepEqual(after.state.game.tiles,before.state.game.tiles);
  for(const [key,value] of Object.entries({theme:'custom',backgroundColor:'#e9d7b8',tileColor:'lavender',textSize:'large',musicTrack:'starlight',menuMusicTrack:'welcome',music:true}))assert.equal(after.state.settings[key],value);
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(233, 215, 184)');
  await page.locator('#settings').click();assert.equal(await page.locator('#musicTrack').inputValue(),'starlight');
  await page.locator('#theme').selectOption('blue');assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(36, 79, 102)');
  await page.locator('#theme').selectOption('');await page.locator('#textSize').selectOption('comfortable');await page.locator('#tileColor').selectOption('classic');await page.locator('#music').uncheck();
  await page.screenshot({path:path.join(screenshots,'settings-personalization.png')});
  await page.locator('#settings-dialog [data-close]').click();
  await page.screenshot({path:path.join(screenshots,'illustrated-garden.png')});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1024,700));
  await page.locator('#settings').click();await page.locator('#textSize').selectOption('large');
  const settingsDialog=page.locator('#settings-dialog');await settingsDialog.evaluate(el=>{el.scrollTop=0;});
  assert.equal(await settingsDialog.evaluate(el=>getComputedStyle(el).scrollbarWidth),'none');
  const more=page.locator('#settings-dialog > .scroll-more');await more.waitFor({state:'visible'});
  await more.click();await page.waitForFunction(()=>document.querySelector('#settings-dialog').scrollTop>0);
  await settingsDialog.evaluate(el=>{el.scrollTop=el.scrollHeight;});await more.waitFor({state:'hidden'});
  const close=await page.locator('#settings-dialog [data-close]').boundingBox(),bounds=await settingsDialog.boundingBox();
  assert.ok(close.y>=bounds.y&&close.y+close.height<=bounds.y+bounds.height,'close remains reachable after scrolling');
  await page.locator('#settings-dialog [data-close]').click();
  console.log('Saved personalization screenshots:',screenshots);
});
