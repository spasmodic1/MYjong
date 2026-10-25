const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
const lock=JSON.parse(await fs.readFile('package-lock.json','utf8')),folder='assets/licenses/dependencies';await fs.mkdir(folder,{recursive:true});
const entries=[];
for(const [dir,p]of Object.entries(lock.packages)){
if(!dir || p.dev)continue;
const name=p.name || dir.split('node_modules/').at(-1);
let files=[];try{files=(await fs.readdir(dir)).filter(f=>/^licen[sc]e|^copying|^notice/i.test(f));}catch{}
const licenseFiles=[];for(const file of files){if((await fs.stat(path.join(dir,file))).isFile()){const dest=name.replaceAll('/','_')+'-'+file;await fs.copyFile(path.join(dir,file),path.join(folder,dest));licenseFiles.push(dest);}}
entries.push({name,version:p.version,license:p.license||'See package notices',source:p.resolved,licenseFiles});
}
await fs.writeFile('assets/licenses/dependency-inventory.json',JSON.stringify(entries,null,2));console.log('Saved license inventory for',entries.length,'runtime dependencies.');
})().catch(e=>{console.error(e);process.exitCode=1;});
