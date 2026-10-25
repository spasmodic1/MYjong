const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const asar=require('@electron/asar'),JSZip=require('jszip');
(async()=>{
const root=path.resolve(process.argv[2]||'dist/win-unpacked'),archive=path.join(root,'resources/app.asar'),files=asar.listPackage(archive).map(f=>f.replaceAll('\\','/'));
assert.ok(!files.some(f=>/^\/Photos\//i.test(f)||f.endsWith('/photo-catalog.json')||/^\/(Screenshots|Private-Gift)\//.test(f)),'unapproved development assets must not be packaged');
assert.ok(files.includes('/assets/recognition.js'));
assert.ok(files.includes('/assets/starter-collection.zip'));
const zip=await JSZip.loadAsync(asar.extractFile(archive,'assets/starter-collection.zip'));
const library=JSON.parse(await zip.file('library.json').async('string'));
assert.equal(library.photos.length,21);assert.equal(library.subjects.length,5);
const update=await fs.readFile(path.join(root,'resources/app-update.yml'),'utf8');assert.match(update,/owner: spasmodic1/);assert.match(update,/repo: MYjong/);
const sums=JSON.parse(asar.extractFile(archive,'assets/model-checksums.json'));
const crypto=require('node:crypto');for(const [file,expected]of Object.entries(sums)){const bytes=asar.extractFile(archive,path.join('assets','models',...file.split('/')));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected);}
console.log('Verified package allowlist, 21 approved starter photos, offline model hashes, and GitHub update channel.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
