const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process');
(async()=>{
 const project=path.resolve(__dirname,'..'),parent=path.join(project,'Temp');await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'uninstall-check-'));
 assert.ok(root.startsWith(parent+path.sep),'test cleanup must stay in the workspace test directory');
 const cacheRoot=path.join(process.env.LOCALAPPDATA,'electron-builder/Cache');let compiler=process.env.MAKENSIS;
 if(!compiler)for(const version of await fs.readdir(cacheRoot)){if(!version.startsWith('nsis-'))continue;const directory=path.join(cacheRoot,version);for(const entry of await fs.readdir(directory,{withFileTypes:true})){if(!entry.isDirectory())continue;const candidate=path.join(directory,entry.name,'Bin/makensis.exe');if(await fs.stat(candidate).then(()=>true,()=>false))compiler=candidate;}}
 assert.ok(compiler,'Build once to cache NSIS, or set MAKENSIS to the compiler path.');
 const source=await fs.readFile(path.join(project,'desktop/installer.nsh'),'utf8');
 try{
 for(const scenario of ['yes','no','cancel','update','silent']){
  const dir=path.join(root,scenario),data=path.join(dir,'data'),cache=path.join(dir,'cache'),original=path.join(dir,'original-photo.jpg'),complete=path.join(dir,'completed.txt');
  await fs.mkdir(data,{recursive:true});await fs.mkdir(cache);await fs.writeFile(path.join(data,'save.json'),'saved');await fs.writeFile(path.join(cache,'installer.exe'),'cached');await fs.writeFile(original,'original');
  const jump=scenario==='no'?'myjongKeepData':scenario==='cancel'?'myjongCancelUninstall':'myjongDeleteData';
  let body=source.replaceAll('$APPDATA\\MYjong',data).replaceAll('$LOCALAPPDATA\\myjong-updater',cache).replaceAll('${isUpdated}','$harnessUpdated == "1"').replace(/^\s*MessageBox MB_YESNOCANCEL.*$/m,'    Goto '+jump).replace(/^\s*MessageBox MB_OK\|MB_ICONEXCLAMATION.*$/m,'      SetErrorLevel 31');
  assert.ok(!body.includes('RMDir /r "$APPDATA')&&!body.includes('RMDir /r "$LOCALAPPDATA'),'all deletion targets must be sandboxed');
  const include=path.join(dir,'hook.nsh'),script=path.join(dir,'test.nsi'),exe=path.join(dir,'test.exe');await fs.writeFile(include,body);
  await fs.writeFile(script,`Unicode true\nName "MYjong uninstall check"\nOutFile "${exe}"\nRequestExecutionLevel user\nSilentInstall silent\n!include "LogicLib.nsh"\nVar installMode\nVar harnessUpdated\n!include "${include}"\nSection\nStrCpy $installMode "all"\nStrCpy $harnessUpdated "${scenario==='update'?'1':'0'}"\nSetSilent ${scenario==='silent'?'silent':'normal'}\n!insertmacro customUnInstall\nFileOpen $0 "${complete}" w\nFileWrite $0 "complete"\nFileClose $0\nSectionEnd\n`);
  const built=spawnSync(compiler,['/V2',script],{encoding:'utf8',windowsHide:true});assert.equal(built.status,0,built.stdout+built.stderr);
  const run=spawnSync(exe,[],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(run.status,scenario==='cancel'?2:0,run.error?.message||run.stdout+run.stderr);
  const exists=async file=>fs.stat(file).then(()=>true,()=>false);
  assert.equal(await exists(data),scenario!=='yes',scenario+' data');assert.equal(await exists(cache),scenario!=='yes',scenario+' cache');assert.equal(await fs.readFile(original,'utf8'),'original');assert.equal(await exists(complete),scenario!=='cancel',scenario+' completion');
  console.log('Passed sandboxed uninstall branch:',scenario);
 }
 }finally{assert.ok(root.startsWith(parent+path.sep));await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
