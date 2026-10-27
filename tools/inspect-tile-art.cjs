const fs=require('node:fs/promises'),sharp=require('sharp');
(async()=>{
 const sources=JSON.parse(await fs.readFile('test-results/tile-art-sources.json','utf8')),entries=Object.entries(sources);
 for(let page=0;page<3;page++){
  const subset=entries.slice(page*9,page*9+9),layers=[];
  for(let i=0;i<subset.length;i++){
   const [id,spec]=subset[i],x=(i%3)*512,y=Math.floor(i/3)*288;
   layers.push({input:await sharp(typeof spec==='string'?spec:spec.path).resize(512,256,{fit:'contain'}).png().toBuffer(),left:x,top:y+26});
   layers.push({input:Buffer.from(`<svg width="512" height="26"><text x="12" y="20" font-size="18" fill="#29493c">${id}</text></svg>`),left:x,top:y});
  }
  await sharp({create:{width:1536,height:Math.ceil(subset.length/3)*288,channels:4,background:'#f6eedb'}}).composite(layers).png().toFile(`test-results/tile-atlases-${page+1}.png`);
 }
 const final=[];
 for(let row=0;row<entries.length;row++)for(let i=0;i<7;i++){
  const id=entries[row][0],group=/^traditional-([a-e])$/.exec(id),file=group?`assets/tiles/traditional/${(group[1].charCodeAt(0)-97)*7+i}.webp`:`assets/seasonal/tiles/${id}/${i}.webp`;
  final.push({input:await sharp(file).resize(128,128).png().toBuffer(),left:i*144+8,top:row*144+8});
 }
 await sharp({create:{width:1008,height:entries.length*144,channels:4,background:'#f6eedb'}}).composite(final).png().toFile('test-results/seasonal-tile-contact-sheet.png');
})().catch(e=>{console.error(e);process.exitCode=1;});
