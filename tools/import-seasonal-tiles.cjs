// Slice a generated 4 × 2 atlas into seven consistent, transparent tile illustrations.
const fs=require('node:fs/promises'),sharp=require('sharp');
(async()=>{
 const sources=JSON.parse(await fs.readFile(process.argv[2],'utf8')),contact=[];
 await fs.mkdir('assets/seasonal/tiles',{recursive:true});
 let row=0;
 for(const [id,spec]of Object.entries(sources)){
  const source=typeof spec==='string'?spec:spec.path,columns=typeof spec==='string'?4:spec.columns||4;
  if(!/^[a-z-]+$/.test(id))throw Error('Invalid theme ID');
  const metadata=await sharp(source).metadata();
  if(!metadata.hasAlpha)throw Error(`${id}: atlas must have transparency`);
  const width=Math.floor(metadata.width/columns),height=Math.floor(metadata.height/2);
  const traditionalGroup=/^traditional-([a-e])$/.exec(id),offset=traditionalGroup?(traditionalGroup[1].charCodeAt(0)-97)*7:null;
  const destination=traditionalGroup?'assets/tiles/traditional':`assets/seasonal/tiles/${id}`;
  await fs.mkdir(destination,{recursive:true});
  for(let i=0;i<7;i++){
   const inset=10;
   const cell=await sharp(source).extract({left:(i%columns)*width+inset,top:Math.floor(i/columns)*height+inset,width:width-inset*2,height:height-inset*2}).png().toBuffer();
   const file=`${destination}/${offset===null?i:offset+i}.webp`;
   await sharp(cell).trim({background:'#00000000',threshold:10}).resize(320,320,{fit:'contain',background:'#00000000'}).webp({quality:92,alphaQuality:100,effort:2}).toFile(file);
   contact.push({input:await sharp(file).resize(128,128).png().toBuffer(),left:i*144+8,top:row*144+8});
  }
  console.log(id,`${metadata.width} × ${metadata.height} → 7 illustrations`);row++;
 }
 await sharp({create:{width:1008,height:row*144,channels:4,background:'#f6eedb'}}).composite(contact).png().toFile('test-results/seasonal-tile-contact-sheet.png');
})().catch(e=>{console.error(e);process.exitCode=1;});
