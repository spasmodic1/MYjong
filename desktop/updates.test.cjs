const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {createUpdates}=require('./updates.cjs');
test('startup checks quietly without downloads, and manual updates require both confirmations',async()=>{
 const updater=new EventEmitter();let checks=0,downloads=0,installs=0,prompts=0,allow=false;
 updater.setFeedURL=()=>{};updater.checkForUpdates=async()=>{checks++;return {isUpdateAvailable:true,updateInfo:{version:'9.0.0'}};};updater.downloadUpdate=async()=>{downloads++;};updater.quitAndInstall=()=>installs++;
 const seen=[],service=createUpdates({updater,feed:{owner:'a',repo:'b'},available:info=>seen.push(info),confirmDownload:async()=>{prompts++;return allow;},confirmInstall:async()=>{prompts++;return allow;}});
 assert.equal(updater.autoDownload,false);assert.equal(updater.autoInstallOnAppQuit,false);
 assert.deepEqual(await service.startup(),{available:true,version:'9.0.0'});assert.equal(checks,1);assert.equal(prompts,0);assert.equal(downloads,0);assert.equal(installs,0);
 assert.equal(await service.interactive(),'Update postponed.');assert.equal(downloads,0);
 allow=true;await service.interactive();assert.equal(downloads,1);assert.equal(installs,1);assert.equal(seen.length,3);
 updater.checkForUpdates=async()=>{updater.emit('error',Error('offline'));throw Error('offline');};assert.deepEqual(await service.startup(),{available:false,offline:true});
});
test('overlapping background and manual checks share a network request',async()=>{
 const updater=new EventEmitter();let checks=0,resolve;updater.setFeedURL=()=>{};updater.checkForUpdates=()=>{checks++;return new Promise(r=>{resolve=r;});};
 const service=createUpdates({updater,feed:{owner:'a',repo:'b'}}),a=service.startup(),b=service.interactive();await Promise.resolve();
 resolve({isUpdateAvailable:false});assert.deepEqual(await a,{available:false,version:null});assert.equal(await b,'You have the latest version.');assert.equal(checks,1);
});
