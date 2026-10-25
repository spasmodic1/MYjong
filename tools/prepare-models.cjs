const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
async function main() {
  const root = path.resolve(__dirname,'..'), folder = path.join(root,'assets','models');
  await fs.mkdir(folder,{recursive:true});
  for (const name of ['tiny_face_detector_model','face_landmark_68_tiny_model','face_recognition_model']) {
    for (const suffix of ['.bin','-weights_manifest.json']) await fs.copyFile(path.join(root,'node_modules/@vladmandic/face-api/model',name+suffix),path.join(folder,name+suffix));
  }
  const petFolder=path.join(folder,'pets'); await fs.mkdir(petFolder,{recursive:true});
  const base='https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/';
  async function download(file) {
    const target=path.join(petFolder,file);
    try { await fs.access(target); return; } catch {}
    const response=await fetch(base+file); if(!response.ok)throw Error(`Model download failed: ${response.status}`);
    await fs.writeFile(target,Buffer.from(await response.arrayBuffer()));
  }
  await download('model.json');
  const manifest=JSON.parse(await fs.readFile(path.join(petFolder,'model.json'),'utf8'));
  for(const group of manifest.weightsManifest) for(const file of group.paths) await download(file);
  const hashes={};
  for(const filename of await fs.readdir(folder,{recursive:true})) {
    const target=path.join(folder,filename); if((await fs.stat(target)).isFile()) hashes[filename.replaceAll('\\','/')]=crypto.createHash('sha256').update(await fs.readFile(target)).digest('hex');
  }
  await fs.writeFile(path.join(root,'assets/model-checksums.json'),JSON.stringify(hashes,null,2));
  await fs.mkdir(path.join(root,'assets/licenses'),{recursive:true});
  for(const [name,file] of [['face-api','@vladmandic/face-api/LICENSE']]) {
    await fs.copyFile(path.join(root,'node_modules',file),path.join(root,'assets/licenses',name+'.txt'));
  }
  for(const [name,url] of [['tensorflow','https://raw.githubusercontent.com/tensorflow/tfjs/master/LICENSE'],['coco-ssd','https://raw.githubusercontent.com/tensorflow/tfjs-models/master/LICENSE'],['dlib-models','https://raw.githubusercontent.com/davisking/dlib-models/master/README.md']]) {
    const response=await fetch(url); if(!response.ok)throw Error('Could not fetch model license');
    await fs.writeFile(path.join(root,'assets/licenses',name+'.txt'),await response.text());
  }
  console.log('Offline model assets prepared and hashed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
