const {spawnSync}=require('node:child_process');
const fs=require('node:fs/promises');
async function main(){
  const credential=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'},windowsHide:true});
  if(credential.status!==0)throw Error('No GitHub CLI credential is available. Connect GitHub or provide the repository URL.');
  const values=Object.fromEntries(credential.stdout.trim().split('\n').map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
  if(!values.password)throw Error('No stored GitHub credential is available.');
  const request=async(endpoint,method='GET',body)=>{
    const response=await fetch('https://api.github.com'+endpoint,{method,headers:{Authorization:'Bearer '+values.password,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'MYjong-development'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error(`GitHub request failed (${response.status}) for ${endpoint}`);
    return response.status===204?null:response.json();
  };
  const profile=await request('/user');
  if(process.argv[2]==='create'){
    let repo;
    try{repo=await request(`/repos/${profile.login}/MYjong`);}catch(e){if(!e.message.includes('(404)'))throw e;}
    repo ||= await request('/user/repos','POST',{name:'MYjong',private:false,description:'Personalized, offline mahjong solitaire for Windows. Familiar faces. A little time for you.',has_issues:true,has_wiki:false,auto_init:false});
    console.log(JSON.stringify({url:repo.html_url,clone:repo.clone_url,account:profile.login,userId:profile.id,private:repo.private}));return;
  }
  if(process.argv[2]==='release'){
    const version=process.argv[3],folder=process.argv[4];
    if(!/^\d+\.\d+\.\d+$/.test(version) || !folder)throw Error('Provide a version and clean release folder.');
    const path=require('node:path');
    const assets=(await fs.readdir(folder)).filter(f=>/^MYjong-Setup-\d+\.\d+\.\d+\.exe(\.blockmap)?$/.test(f)||f==='latest.yml');
    if(assets.length!==3)throw Error('Expected exactly the clean installer, blockmap, and latest.yml.');
    let release;
    try{release=await request(`/repos/${profile.login}/MYjong/releases/tags/v${version}`);}catch(e){if(!e.message.includes('(404)'))throw e;}
    release ||= await request(`/repos/${profile.login}/MYjong/releases`,'POST',{tag_name:'v'+version,name:'MYjong '+version,draft:true,prerelease:false,body:await fs.readFile('RELEASE-NOTES.md','utf8')});
    for(const filename of assets){
      const old=release.assets.find(a=>a.name===filename);if(old)await request(`/repos/${profile.login}/MYjong/releases/assets/${old.id}`,'DELETE');
      const bytes=await fs.readFile(path.join(folder,filename));
      const url=release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(filename);
      const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+values.password,'Content-Type':'application/octet-stream','User-Agent':'MYjong-development'},body:bytes,signal:AbortSignal.timeout(240000)});
      if(!response.ok)throw Error(`Asset upload failed (${response.status}): ${filename}`);
      console.log('Uploaded',filename);
    }
    const published=await request(`/repos/${profile.login}/MYjong/releases/${release.id}`,'PATCH',{draft:false});
    console.log('Published',published.html_url);return;
  }
  if(process.argv[2]==='inspect'){
    const repos=await request('/user/repos?per_page=100&sort=updated');
    console.log(JSON.stringify({account:profile.login,name:profile.name,repositories:repos.filter(r=>/mahjong|myjong|christmas/i.test(r.name)).map(r=>({name:r.full_name,private:r.private,url:r.html_url})),updatedRepos:repos.slice(0,8).map(r=>({name:r.full_name,private:r.private}))},null,2));
    return;
  }
  throw Error('Unknown action');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
