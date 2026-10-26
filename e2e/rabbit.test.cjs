const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {_electron:electron}=require('@playwright/test');const root=path.resolve(__dirname,'..');
test('red rabbit renders and matches as a default traditional tile',{timeout:30000},async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-rabbit-'));
 const {makeGame,defaults,emptyStats,validState}=await import('../src/game.js');
 const settings={...defaults,collection:'traditional'},game=makeGame(settings,{photos:[],subjects:[]});
 game.tiles=Array.from({length:6},(_,id)=>({id,x:(id%2)*3+1,y:Math.floor(id/2)*2,z:0,face:id<2?44:10+Math.floor(id/2),removed:false}));game.initialSolution=[[0,1],[2,3],[4,5]];
 const state={version:2,settings,stats:emptyStats(),game};assert.equal(validState(state),true);
 await fs.writeFile(path.join(dir,'state.json'),JSON.stringify(state));await fs.writeFile(path.join(dir,'library.json'),JSON.stringify({version:1,photos:[],subjects:[]}));
 const app=await electron.launch({...process.env.MYJONG_TEST_PACKAGE==='1'?{executablePath:path.join(root,'dist/win-unpacked/MYjong.exe')}:{args:[root]},env:{...process.env,MYJONG_TEST_DATA:dir,MYJONG_SMOKE:'1'}});
 t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true});});
 const page=await app.firstWindow();await page.waitForSelector('#splash-dialog[open]');await page.keyboard.press('Enter');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForSelector('#board .tile[data-id="0"] svg');
 const rabbit=page.locator('#board .tile[data-id="0"]');assert.match(await rabbit.getAttribute('aria-label'),/Red rabbit/);assert.ok(await rabbit.locator('path').count()>3);
 const screenshots=path.join(root,'Screenshots/red-rabbit');await fs.mkdir(screenshots,{recursive:true});await rabbit.screenshot({path:path.join(screenshots,'tile.png')});await page.screenshot({path:path.join(screenshots,'board.png')});
 await rabbit.click();await page.locator('#board .tile[data-id="1"]').click();await page.locator('#board .tile[data-id="0"]').waitFor({state:'detached'});assert.equal(await page.locator('#board .tile').count(),4);
});
