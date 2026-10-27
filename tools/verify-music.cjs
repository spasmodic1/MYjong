const fs=require('node:fs'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const arrangements=JSON.parse(fs.readFileSync('assets/music/arrangements.json','utf8'));
for(const [id,expected] of Object.entries(arrangements)){
 const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-v','error','-i',`assets/music/${id}.ogg`,'-f','f32le','-ac','2','-ar','44100','pipe:1'],{windowsHide:true,maxBuffer:128*1024*1024});
 assert.equal(result.status,0,result.stderr?.toString());const b=result.stdout,data=new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));let peak=0,power=0;
 for(const value of data){assert.ok(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));power+=value*value;}
 const rms=Math.sqrt(power/data.length),seconds=data.length/88200,seam=Math.max(Math.abs(data[0]-data.at(-2)),Math.abs(data[1]-data.at(-1)));
 assert.ok(Math.abs(seconds-expected.seconds)<.1,id+' duration');assert.ok(peak<.95&&rms>.025,id+' level');assert.ok(seam<.08,id+' loop seam');assert.equal(expected.renderer,'VCSL recorded instruments');
 console.log(id,JSON.stringify({seconds,peak,rms,seam}));
}
