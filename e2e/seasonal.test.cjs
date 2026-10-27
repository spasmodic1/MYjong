const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
test('seasonal preview, monthly skins, opt-outs and saved puzzle survive toggles and reload',{timeout:90000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-seasonal-'));
 const app=await electron.launch({args:[root],env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');
 await page.evaluate(()=>{const Native=Date;window.NativeDate=Native;window.seasonMonth=9;window.Date=class extends Native{constructor(...args){super(...(args.length?args:[2026,window.seasonMonth,15,12]));}};});
 // Reloading is covered later; the day-change watcher applies the mocked local month.
 await page.waitForFunction(()=>document.body.dataset.season==='halloween',null,{timeout:15000});
 const before=await page.evaluate(()=>window.myjong.load());
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setAudioMuted(true));
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{get:()=>false,configurable:true});
  const Native=Audio;window.seasonPlayers=[];window.Audio=class extends Native{constructor(...args){super(...args);window.seasonPlayers.push(this);}};
 });
 assert.ok((await page.locator('.seasonal-mini img').getAttribute('src')).endsWith('/halloween/0.webp'));
 assert.ok(await page.locator('#board .seasonal-face').count()>0);
 await page.locator('#seasonal-toggle').click();assert.equal(await page.locator('body').getAttribute('data-season'),'');
 assert.equal(await page.locator('#board .seasonal-face').count(),0);assert.equal(await page.locator('dialog[open]').count(),0);
 await page.locator('#seasonal-toggle').click();await page.locator('#settings').click();
 assert.equal(await page.locator('#seasonalFaceMix').inputValue(),'mixed');
 await page.locator('#seasonalFaceMix').selectOption('all');assert.equal(await page.locator('#board .tile-standard').count(),0);
 await page.locator('#seasonalFaceMix').selectOption('mixed');
 for(const tile of before.state.game.tiles.filter(t=>!t.removed&&t.face>=10))assert.equal(await page.locator(`#board .tile[data-id="${tile.id}"] .seasonal-face`).count(),(tile.face-10)%2===0?1:0);
 await page.locator('input[data-season="halloween"]').uncheck();assert.equal(await page.locator('body').getAttribute('data-season'),'');
 await page.locator('input[data-season="halloween"]').check();
 await page.locator('#seasonalTiles').uncheck();assert.equal(await page.locator('#board .seasonal-face').count(),0);
 await page.locator('#seasonalTiles').check();await page.locator('#theme').selectOption('seasonal');
 await page.locator('#captions').uncheck();assert.equal(await page.locator('#board .seasonal-number').first().isVisible(),true);
 await page.locator('#captions').check();assert.equal(await page.locator('#board .seasonal-number').first().isVisible(),true);await page.locator('#captions').uncheck();
 await page.locator('#seasonalBackground').uncheck();assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('seasonal-background')),false);
 await page.locator('#seasonalBackground').check();
 await page.locator('#music').check();
 await page.locator('#settings-dialog [data-close]').click();
 const shots=path.join(root,'Screenshots/tile-art',`review-${Date.now()}`);await fs.mkdir(shots,{recursive:true});
 for(let m=0;m<12;m++){
  await page.evaluate(m=>{window.seasonMonth=m;},m);
  await page.locator('#seasonal-toggle').click();await page.locator('#seasonal-toggle').click();
  assert.notEqual(await page.locator('body').getAttribute('data-season'),'');
  const background=await page.locator('#board-space').evaluate(async el=>{
   const image=new Image();image.src=getComputedStyle(el).backgroundImage.match(/url\("([^"]+)"\)/)[1];
   await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};
  });
  assert.ok(background.width>=1400&&background.height>=900);
  if(m===6)assert.equal(await page.evaluate(async()=>{
   const {seasons,seasonalArt}=await import('./src/seasonal.js');return seasonalArt(seasons.find(s=>s.id==='july'),2).querySelector('img').src.endsWith('/july/2.webp');
  }),true);
  const music={0:'snowfall',3:'spring-bloom',4:'spring-bloom',9:'halloween-waltz',11:'christmas-bells'}[m];
  if(music)await page.waitForFunction(track=>window.seasonPlayers.some(p=>p.src.endsWith('/'+track+'.ogg')&&!p.paused&&p.readyState>=2&&Number.isFinite(p.duration)&&p.duration>60),music);
  await page.locator('#board').evaluate(async el=>{await Promise.all([...el.querySelectorAll('img')].map(img=>img.decode()));});
  await page.screenshot({path:path.join(shots,`${String(m+1).padStart(2,'0')}.png`)});
 }
 await page.locator('#settings').click();await page.locator('input[data-season="hanukkah"]').check();await page.getByLabel('December preferred theme',{exact:true}).selectOption('hanukkah');
 assert.equal(await page.locator('body').getAttribute('data-season'),'hanukkah');
 await page.locator('#settings-dialog [data-close]').click();await page.screenshot({path:path.join(shots,'hanukkah.png')});
 await page.waitForFunction(()=>window.seasonPlayers.some(p=>p.src.endsWith('/candlelight.ogg')&&!p.paused&&p.readyState>=2&&Number.isFinite(p.duration)));
 await page.locator('#settings').click();await page.locator('#seasonalMusic').uncheck();
 await page.waitForFunction(()=>window.seasonPlayers.some(p=>p.src.endsWith('/moonlight.ogg')&&!p.paused&&p.readyState>=2));
 await page.locator('#seasonalMusic').check();await page.locator('#settings-dialog [data-close]').click();
 for(const [month,id] of [[1,'lunar'],[3,'earth'],[7,'summer-nights'],[10,'harvest'],[11,'solstice']]){
  await page.evaluate(m=>{window.seasonMonth=m;},month);await page.locator('#settings').click();
  await page.locator(`input[data-season="${id}"]`).check();
  await page.getByLabel(new Date(2026,month,1).toLocaleString('en-US',{month:'long'})+' preferred theme',{exact:true}).selectOption(id);
  assert.equal(await page.locator('body').getAttribute('data-season'),id);
  await page.locator('#settings-dialog [data-close]').click();await page.screenshot({path:path.join(shots,id+'.png')});
 }
 await page.locator('#settings').click();await page.getByLabel('December preferred theme',{exact:true}).selectOption('hanukkah');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1024,700));
 await page.locator('#textSize').selectOption('large');await page.locator('#seasonal-heading').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(shots,'settings-small-screen.png')});
 await page.locator('#settings-dialog [data-close]').click();
 const dimensionErrors=await page.evaluate(async()=>{
  const {seasons,seasonalArt,seasonalFace}=await import('./src/seasonal.js'),board=document.querySelector('#board'),errors=[];
  const original=board.style.getPropertyValue('--tile-width');
  for(const season of seasons)for(const width of [37,68,125]){
   board.style.setProperty('--tile-width',width+'px');const fixtures=[];
   for(let face=0;face<35;face++){
    const tile=document.createElement('button');tile.className='tile';tile.append(seasonalArt(season,face));
    const caption=document.createElement('span');caption.className='tile-caption';caption.textContent=seasonalFace(season,face).name;tile.append(caption);board.append(tile);fixtures.push(tile);
    const r=tile.getBoundingClientRect();if(Math.abs(r.width-width)>.1||Math.abs(r.height-width*1.5)>.1)errors.push({season:season.id,face,width,actual:[r.width,r.height]});
    const container=tile.querySelector('.seasonal-face').getBoundingClientRect(),number=tile.querySelector('.seasonal-number').getBoundingClientRect();if(number.bottom>container.bottom+.1||number.top<container.top-.1)errors.push({season:season.id,face,width,numberClipped:true});
   }
   fixtures.forEach(el=>el.remove());
  }
  board.style.setProperty('--tile-width',original);return errors;
 });assert.deepEqual(dimensionErrors,[],'all seasonal tile shells must have identical dimensions');
 const loadedArt=await page.evaluate(async()=>{
  const {seasons,seasonalImageUrl}=await import('./src/seasonal.js'),{standardImageUrl}=await import('./src/standard-tiles.js');
  const urls=[...Array.from({length:35},(_,i)=>standardImageUrl(i)),...seasons.flatMap(s=>Array.from({length:7},(_,i)=>seasonalImageUrl(s,i)))];
  await Promise.all(urls.map(async url=>{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth!==320||image.naturalHeight!==320)throw Error(url);}));return urls.length;
 });assert.equal(loadedArt,161);
 await page.waitForFunction(async()=>{const {state}=await window.myjong.load();return state.settings.seasonalPreferred[11]==='hanukkah';});
 await page.reload();await page.waitForSelector('#board .tile');await page.keyboard.press('Enter');
 const after=await page.evaluate(()=>window.myjong.load());assert.deepEqual(after.state.game.tiles,before.state.game.tiles);assert.equal(after.state.settings.seasonalPreferred[11],'hanukkah');
 assert.equal(after.state.settings.theme,'seasonal');
 assert.equal(after.state.settings.seasonalFaceMix,'mixed');
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.unmaximize();w.setSize(1380,1200);});
 await page.evaluate(async()=>{
  const {standardArt,standardName}=await import('./src/standard-tiles.js'),gallery=document.createElement('div');gallery.id='painted-art-review';
  gallery.style.cssText='position:fixed;inset:0;z-index:99999;background:#173f35;padding:24px;overflow:auto;color:#fff1ce;';
  const heading=document.createElement('h2');heading.textContent='Painted traditional tiles';heading.style.cssText='text-align:center;margin:0 0 20px';gallery.append(heading);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:14px;--tile-width:100px';
  for(let i=0;i<35;i++){const item=document.createElement('div');item.style.cssText='display:flex;flex-direction:column;align-items:center;gap:12px';const tile=document.createElement('div');tile.className='tile';tile.style.position='relative';tile.append(standardArt(i));const name=document.createElement('span');name.textContent=standardName(i);name.style.fontSize='13px';item.append(tile,name);grid.append(item);}
  gallery.append(grid);document.body.append(gallery);await Promise.all([...gallery.querySelectorAll('img')].map(img=>img.decode()));
 });
 await page.screenshot({path:path.join(shots,'painted-traditional.png')});
 await page.locator('#painted-art-review').evaluate(el=>el.remove());
 await fs.writeFile(path.join(root,'test-results/latest-tile-art-review.txt'),shots);console.log('Painted tile previews:',shots);
});
