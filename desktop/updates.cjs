function createUpdates({updater,feed,confirmDownload,confirmInstall,notify=()=>{},available=()=>{}}){
 updater.setFeedURL({provider:'github',owner:feed.owner,repo:feed.repo});
 updater.autoDownload=false;updater.autoInstallOnAppQuit=false;
 updater.on('download-progress',p=>notify(`Downloading MYjong… ${Math.round(p.percent)}%`));
 updater.on('update-downloaded',()=>notify('Update downloaded. Ready when you are.'));
 // Background network errors must never become an unhandled EventEmitter error.
 updater.on('error',()=>{});
 let checking=null;
 async function check(){
  if(!checking)checking=Promise.resolve().then(()=>updater.checkForUpdates()).finally(()=>{checking=null;});
  const result=await checking,version=result?.isUpdateAvailable?result.updateInfo.version:null;
  const info={available:Boolean(version),version};available(info);return info;
 }
 return {
  async startup(){try{return await check();}catch{return {available:false,offline:true};}},
  async interactive(){
   const info=await check();if(!info.available)return 'You have the latest version.';
   if(!await confirmDownload(info.version))return 'Update postponed.';
   await updater.downloadUpdate();if(await confirmInstall())updater.quitAndInstall();
   return 'Update downloaded. Use Check for Updates when you are ready to install.';
  }
 };
}
module.exports={createUpdates};
