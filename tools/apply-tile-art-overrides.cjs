const fs=require('node:fs/promises'),sharp=require('sharp');
(async()=>{
 const entries=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
 for(const {source,target}of entries){
  if(!/^assets\/(tiles\/traditional\/\d+|seasonal\/tiles\/[a-z-]+\/[0-6])\.webp$/.test(target))throw Error('Invalid tile target');
  await sharp(source).trim({background:'#00000000',threshold:10}).resize(320,320,{fit:'contain',background:'#00000000'}).webp({quality:92,alphaQuality:100,effort:2}).toFile(target);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
