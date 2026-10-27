const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {loadReleaseFiles}=require('../tools/publish-release-metadata.cjs');
test('release metadata refuses a version or checksum that does not match the installer',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'myjong-release-metadata-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const bytes=Buffer.from('verified installer'),sha512=crypto.createHash('sha512').update(bytes).digest('base64');
 await fs.writeFile(path.join(dir,'MYjong-Setup-0.9.9.exe'),bytes);await fs.writeFile(path.join(dir,'MYjong-Setup-0.9.9.exe.blockmap'),'blockmap');
 await fs.writeFile(path.join(dir,'latest.yml'),`version: 0.9.9\npath: MYjong-Setup-0.9.9.exe\nsha512: ${sha512}\n`);
 assert.equal((await loadReleaseFiles(dir,'0.9.9')).size,bytes.length);
 await fs.writeFile(path.join(dir,'latest.yml'),'version: 0.9.9\npath: MYjong-Setup-0.9.9.exe\nsha512: bad\n');await assert.rejects(loadReleaseFiles(dir,'0.9.9'),/does not match/);
 await fs.writeFile(path.join(dir,'latest.yml'),`version: 0.9.8\npath: MYjong-Setup-0.9.9.exe\nsha512: ${sha512}\n`);await assert.rejects(loadReleaseFiles(dir,'0.9.9'),/does not match/);
});
