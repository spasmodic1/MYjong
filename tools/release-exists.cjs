const fs=require('node:fs/promises'),feed=require('../release-config.json'),pkg=require('../package.json');
(async()=>{
  const tag=process.env.GITHUB_REF_NAME||`v${pkg.version}`;
  if(tag!==`v${pkg.version}`)throw Error('Release tag and package version must match.');
  const headers={Accept:'application/vnd.github+json','User-Agent':'MYjong-release-check'};
  if(process.env.GITHUB_TOKEN)headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
  const response=await fetch(`https://api.github.com/repos/${feed.owner}/${feed.repo}/releases/tags/${tag}`,{headers});
  let published=false;if(response.ok){const r=await response.json();published=!r.draft&&[`MYjong-Setup-${pkg.version}.exe`,`MYjong-Setup-${pkg.version}.exe.blockmap`,'latest.yml'].every(name=>r.assets.some(a=>a.name===name&&a.state==='uploaded'));}
  else if(response.status!==404)throw Error(`Cannot inspect release: ${response.status}`);
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`published=${published}\n`);
  console.log(published?'Published release assets already exist; rebuild without replacing them.':'No complete published release exists; this tag will publish it.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
