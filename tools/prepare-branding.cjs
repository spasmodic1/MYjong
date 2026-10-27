// Format conversion and application icon sizes from the approved generated artwork.
const fs=require('node:fs/promises'),sharp=require('sharp');
(async()=>{
  const source='assets/branding/icon-master-v2.png',buffers=[];
  for(const size of [256,128,64,48,32,16])buffers.push({size,bytes:await sharp(source).resize(size,size).png().toBuffer()});
  const header=Buffer.alloc(6+16*buffers.length);header.writeUInt16LE(1,2);header.writeUInt16LE(buffers.length,4);let offset=header.length;
  buffers.forEach(({size,bytes},i)=>{const start=6+i*16;header[start]=size===256?0:size;header[start+1]=header[start];header.writeUInt16LE(1,start+4);header.writeUInt16LE(32,start+6);header.writeUInt32LE(bytes.length,start+8);header.writeUInt32LE(offset,start+12);offset+=bytes.length;});
  await fs.writeFile('assets/icon.ico',Buffer.concat([header,...buffers.map(b=>b.bytes)]));await fs.writeFile('assets/icon.png',buffers[0].bytes);
  await sharp(source).resize(128,128).webp({quality:95}).toFile('assets/branding/emblem-v2.webp');
  await sharp('assets/branding/wordmark-master.png').trim().resize({width:720}).webp({quality:95}).toFile('assets/branding/wordmark.webp');
  await sharp('assets/branding/garden-frame-master.png').webp({quality:90}).toFile('assets/branding/garden-frame.webp');
  for(const file of ['icon-master-v2.png','wordmark-master.png','garden-frame-master.png']){
    const stats=await sharp('assets/branding/'+file).stats();console.log(file,JSON.stringify({hasAlpha:!stats.isOpaque,centerAlpha:stats.channels[3]?.mean}));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
