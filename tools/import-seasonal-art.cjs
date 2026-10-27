// Convert the selected ImageGen outputs to bundled static offline backgrounds.
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const entries=JSON.parse(await fs.readFile(process.argv[2],'utf8'));await fs.mkdir('assets/seasonal',{recursive:true});
 for(const [id,source]of Object.entries(entries)){
  if(!/^[a-z-]+$/.test(id))throw Error('Invalid theme name');
  await sharp(source).webp({quality:88,effort:6}).toFile(`assets/seasonal/${id}.webp`);
  const info=await sharp(`assets/seasonal/${id}.webp`).metadata();console.log(id,info.width+'x'+info.height);
 }
 const images=Object.keys(entries),thumbs=await Promise.all(images.map(async(id,i)=>({input:await sharp(`assets/seasonal/${id}.webp`).resize(384,256).png().toBuffer(),left:(i%3)*384,top:Math.floor(i/3)*282})));
 await sharp({create:{width:1152,height:Math.ceil(images.length/3)*282,channels:3,background:'#172c32'}}).composite(thumbs).png().toFile('test-results/seasonal-art-contact-sheet.png');
})().catch(e=>{console.error(e);process.exitCode=1;});
