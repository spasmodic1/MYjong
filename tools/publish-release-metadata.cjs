// Publish update metadata only when it matches the installer already on GitHub.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const feed=require('../release-config.json'),pkg=require('../package.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function loadReleaseFiles(directory,version){
 const name=`MYjong-Setup-${version}.exe`,installer=await fs.readFile(path.join(directory,name)),manifest=await fs.readFile(path.join(directory,'latest.yml')),blockmap=await fs.readFile(path.join(directory,name+'.blockmap'));
 const text=manifest.toString(),sha512=crypto.createHash('sha512').update(installer).digest('base64'),hashes=[...text.matchAll(/^\s*sha512:\s*(\S+)\s*$/gm)].map(m=>m[1]);
 if(!text.split(/\r?\n/).includes(`version: ${version}`)||!text.includes(name)||!hashes.length||hashes.some(h=>h!==sha512)||!blockmap.length)throw Error('Update metadata does not match the installer');
 return {name,sha256:hash(installer),size:installer.length,metadata:[{name:name+'.blockmap',bytes:blockmap},{name:'latest.yml',bytes:manifest}]};
}
async function publishMetadata(directory='dist',token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN){
 if(!token)throw Error('GitHub release token is required');
 const local=await loadReleaseFiles(directory,pkg.version),headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'MYjong-release-metadata'};
 const request=async(url,options={})=>{const response=await fetch(url,{...options,headers:{...headers,...options.headers}});if(!response.ok)throw Error(`GitHub release metadata request failed: HTTP ${response.status}`);return response;};
 const release=await (await request(`https://api.github.com/repos/${feed.owner}/${feed.repo}/releases/tags/v${pkg.version}`)).json();
 const installer=release.assets.find(a=>a.name===local.name&&a.state==='uploaded');
 if(!installer||installer.size!==local.size)throw Error('Published installer is missing or differs in size');
 const remoteDigest=installer.digest||`sha256:${hash(Buffer.from(await (await request(installer.url,{headers:{Accept:'application/octet-stream'}})).arrayBuffer()))}`;
 if(remoteDigest!==`sha256:${local.sha256}`)throw Error('Published installer differs from this build; refusing mismatched update metadata');
 const upload=new URL(release.upload_url.split('{')[0]);if(upload.protocol!=='https:'||upload.hostname!=='uploads.github.com')throw Error('Unexpected upload host');
 for(const file of local.metadata){
  const existing=release.assets.find(a=>a.name===file.name);
  if(existing){
   const digest=existing.digest||`sha256:${hash(Buffer.from(await (await request(existing.url,{headers:{Accept:'application/octet-stream'}})).arrayBuffer()))}`;
   if(digest!==`sha256:${hash(file.bytes)}`)throw Error(`Existing ${file.name} differs; refusing to replace it`);
   console.log(`Verified existing ${file.name}`);continue;
  }
  upload.searchParams.set('name',file.name);
  const result=await (await request(upload.href,{method:'POST',headers:{'Content-Type':file.name.endsWith('.yml')?'text/yaml':'application/octet-stream'},body:file.bytes})).json();
  if(result.state!=='uploaded')throw Error(`Upload did not complete: ${file.name}`);console.log(`Published ${file.name}`);
 }
 return {version:pkg.version,installerSha256:local.sha256};
}
module.exports={loadReleaseFiles,publishMetadata};
if(require.main===module)publishMetadata(process.argv[2]||'dist').catch(e=>{console.error(e.message);process.exitCode=1;});
