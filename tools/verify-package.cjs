const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const asar=require('@electron/asar'),JSZip=require('jszip');
(async()=>{
const root=path.resolve(process.argv[2]||'dist/win-unpacked'),archive=path.join(root,'resources/app.asar'),files=asar.listPackage(archive).map(f=>f.replaceAll('\\','/'));
assert.ok(!files.some(f=>/^\/Photos\//i.test(f)||f.endsWith('/photo-catalog.json')||/^\/(Screenshots|Private-Gift)\//.test(f)),'unapproved development assets must not be packaged');
// Detect source edits during packaging, which can corrupt ASAR file offsets.
const runtimeFiles=files.filter(f=>f==='/index.html'||/^\/(src|desktop)\/.*\.(js|cjs|css)$/.test(f));
for(const file of runtimeFiles){
  const relative=file.slice(1),packed=asar.extractFile(archive,relative),source=await fs.readFile(path.resolve(__dirname,'..',relative));
  assert.ok(packed.equals(source),`Packaged runtime differs from source: ${relative}. Rebuild without editing files during packaging.`);
}
assert.ok(files.includes('/assets/recognition.js'));
assert.ok(files.includes('/assets/starter-collection.zip'));
for(const track of ['garden','river','moonlight','sunroom','starlight','welcome','snowfall','christmas-bells','halloween-waltz','candlelight','spring-bloom'])assert.ok(files.includes(`/assets/music/${track}.ogg`),'offline arrangement must be bundled');
for(const theme of (await import('../src/seasonal.js')).seasons)assert.ok(files.includes(`/assets/seasonal/${theme.id}.webp`),'seasonal scene must be bundled');
for(const theme of (await import('../src/seasonal.js')).seasons)for(let i=0;i<7;i++)assert.ok(files.includes(`/assets/seasonal/tiles/${theme.id}/${i}.webp`),'painted seasonal face must be bundled');
for(let i=0;i<35;i++)assert.ok(files.includes(`/assets/tiles/traditional/${i}.webp`),'painted traditional face must be bundled');
const zip=await JSZip.loadAsync(asar.extractFile(archive,'assets/starter-collection.zip'));
assert.equal(zip.file('state.json'),null,'starter photos must not override current game defaults');
const library=JSON.parse(await zip.file('library.json').async('string'));
assert.equal(library.photos.length,21);assert.equal(library.subjects.length,5);
const update=await fs.readFile(path.join(root,'resources/app-update.yml'),'utf8');assert.match(update,/owner: spasmodic1/);assert.match(update,/repo: MYjong/);assert.match(update,/updaterCacheDirName: myjong-updater/);
const sums=JSON.parse(asar.extractFile(archive,'assets/model-checksums.json'));
const crypto=require('node:crypto');for(const [file,expected]of Object.entries(sums)){const bytes=asar.extractFile(archive,path.join('assets','models',...file.split('/')));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected);}
console.log('Verified exact runtime file contents, package allowlist, 21 approved starter photos, offline model hashes, and GitHub update channel.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
