const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test');const root=path.resolve(__dirname,'..');
test('mixed drops preserve faces and selections, keep counting without matches, and allow a win',{timeout:30000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-mixed-'));
 const {makeGame,defaults,emptyStats,validState}=await import('../src/game.js');
 const {addRacePair}=await import('../src/race.js');const {pairs}=await import('../src/rules.js');
 const settings={...defaults,mode:'race',raceInterval:5,collection:'traditional'},game=makeGame(settings,{photos:[],subjects:[]});
 game.tiles=Array.from({length:8},(_,id)=>({id,x:(id%3)*3,y:Math.floor(id/3)*2,z:0,face:10+Math.floor(id/2),removed:false}));game.initialSolution=[[0,1],[2,3],[4,5],[6,7]];
 const remove=pair=>{for(const tile of pair)tile.removed=true;game.history.push({type:'match',ids:pair.map(t=>t.id)});};
 remove([game.tiles[6],game.tiles[7]]);addRacePair(game,()=>0);while(pairs(game.tiles).length)remove(pairs(game.tiles)[0]);game.elapsed=34;
 const existing=structuredClone(game.tiles.filter(t=>!t.removed)),state={version:2,settings,stats:emptyStats(),game};assert.equal(existing.length,2);assert.equal(validState(state),true);
 await fs.writeFile(path.join(dir,'state.json'),JSON.stringify(state));await fs.writeFile(path.join(dir,'library.json'),JSON.stringify({version:1,photos:[],subjects:[]}));
 const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe')}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForSelector('#splash-dialog[open]');await page.keyboard.press('Enter');
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{get:()=>false,configurable:true}));
 const selectedId=existing[0].id;await page.locator(`#board .tile[data-id="${selectedId}"]`).click();
 await page.locator('#board .tile').nth(3).waitFor();assert.equal(await page.locator('#loss-dialog').isVisible(),false);
 assert.equal(await page.locator('#board .tile.selected').getAttribute('data-id'),String(selectedId));
 await page.locator('#pause').click();const after=(await page.evaluate(()=>window.myjong.load())).state.game;
 assert.equal(after.race.waves,2);assert.equal(validState({...state,game:after}),true);
 for(const old of existing)assert.deepEqual(after.tiles.find(t=>t.id===old.id),old);
 const arrival=after.history.filter(h=>h.type==='arrival').at(-1),added=arrival.tiles.map(t=>after.tiles.find(c=>c.id===t.id));assert.notEqual(added[0].face,added[1].face);
 await page.locator('#resume').click();for(let pair=0;pair<2;pair++){await page.locator('#hint').click();const ids=await page.locator('#board .tile.hint').evaluateAll(tiles=>tiles.map(t=>t.dataset.id));assert.equal(ids.length,2);for(const id of ids)await page.locator(`#board .tile[data-id="${id}"]`).click();}
 await page.waitForSelector('#win-dialog[open]');assert.deepEqual(errors,[]);
});
