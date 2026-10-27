// Original MYjong score, rendered with pinned CC0 VCSL recorded instruments.
// Run node tools/prepare-music-samples.cjs first. Only finished Ogg tracks ship.
const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process');
const sampleRate=44100;
let recordings=[];
const scores={
  snowfall:{bpm:70,lead:'bell',arp:'harp',chords:[[50,62,65,69,76],[46,58,62,65,72],[53,60,65,69,74],[48,60,64,67,74]],seed:211,sparse:true},
  'christmas-bells':{bpm:108,lead:'bell',arp:'harp',chords:[[48,60,64,67,72],[41,53,57,60,69],[43,55,59,62,67],[48,55,60,64,72]],seed:223,jingle:true,motifs:[[[0,1,3],[1,1,3],[2,2,4],[4,1,2],[5,1,3],[6,2,4]],[[0,2,4],[2,1,3],[3,1,2],[4,2,1],[6,2,2]]]},
  'halloween-waltz':{bpm:82,lead:'celesta',arp:'plucky',chords:[[45,57,60,64,69],[41,53,57,60,65],[44,56,59,62,68],[40,52,56,59,64]],seed:227,sparse:true,motifs:[[[0,1,2],[2,1,3],[3,1,4],[5,2,2]],[[1,1,4],[3,1,3],[4,2,2],[7,1,1]]]},
  candlelight:{bpm:76,lead:'harp',arp:'bell',chords:[[50,62,65,69,74],[46,58,62,65,72],[43,55,58,62,67],[45,57,61,64,69]],seed:229,sparse:true},
  'spring-bloom':{bpm:88,lead:'piano',arp:'harp',chords:[[53,65,69,72,76],[50,62,65,69,74],[46,58,62,65,72],[48,60,64,67,74]],seed:233,swing:.035},
  garden:{bpm:78,lead:'piano',arp:'harp',chords:[[48,60,64,67,71],[45,57,60,64,67],[41,53,57,60,64],[43,55,59,62,69]],seed:17},
  river:{bpm:94,lead:'harp',arp:'piano',chords:[[38,50,57,60,65],[46,58,62,65,69],[41,53,57,60,67],[43,55,60,62,67]],seed:29,swing:.055},
  moonlight:{bpm:66,lead:'piano',arp:'bell',chords:[[45,57,60,64,71],[41,53,57,60,64],[48,55,60,64,67],[43,55,59,62,69]],seed:43,sparse:true},
  sunroom:{bpm:92,lead:'piano',arp:'harp',chords:[[41,53,57,60,67],[38,50,53,57,60],[46,53,58,62,65],[48,55,60,64,67]],seed:61,swing:.035},
  starlight:{bpm:72,lead:'bell',arp:'harp',chords:[[48,60,64,67,74],[45,57,60,64,71],[41,53,57,60,67],[43,55,59,62,69]],seed:73,sparse:true},
  welcome:{bpm:70,lead:'piano',arp:'harp',chords:[[48,55,60,64,71],[41,53,57,60,67],[45,57,60,64,71],[43,55,59,62,69]],seed:101,sparse:true,menu:true}
};
function render(id,song){
  const beat=60/song.bpm,bars=32,duration=bars*4*beat,length=Math.round(duration*sampleRate),left=new Float32Array(length),right=new Float32Array(length);
  let seed=song.seed;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function note(midi,start,duration,level,instrument,pan=0){
    const family=({celesta:'bell',plucky:'harp',bass:'piano'})[instrument]||instrument;
    const candidates=recordings.filter(s=>s.instrument===family),sample=candidates.reduce((a,b)=>Math.abs(b.midi-midi)<Math.abs(a.midi-midi)?b:a);
    const rate=2**((midi-sample.midi)/12),offset=Math.round(start*sampleRate),release=instrument==='pad'?.9:.55;
    const count=Math.min(Math.round((duration+release)*sampleRate),Math.floor((sample.data.length/2-1)/rate));
    const gainL=Math.sqrt((1-pan)/2)*level,gainR=Math.sqrt((1+pan)/2)*level;
    for(let i=0;i<count;i++){
      const position=i*rate,frame=Math.floor(position),fraction=position-frame,time=i/sampleRate;
      const attack=instrument==='pad'?Math.min(1,time/.65):Math.min(1,time/.004);
      const envelope=attack*Math.min(1,Math.max(0,(duration+release-time)/release));
      const index=((offset+i)%length+length)%length;
      const l=sample.data[frame*2]*(1-fraction)+sample.data[(frame+1)*2]*fraction;
      const r=sample.data[frame*2+1]*(1-fraction)+sample.data[(frame+1)*2+1]*fraction;
      left[index]+=l*envelope*gainL;right[index]+=r*envelope*gainR;
    }
  }
  const motifs=song.motifs||[[[0,2,2],[3,1,3],[4,2,4],[7,1,2]],[[0,3,3],[3,1,2],[5,2,1]],[[1,2,2],[4,1,3],[5,2,4],[7,1,3]],[[0,2,2],[2,2,1],[5,3,2]]];
  for(let bar=0;bar<bars;bar++){
    const chord=song.chords[bar%4],start=bar*4*beat,section=Math.floor(bar/8),expression=(.82+.16*Math.sin(Math.PI*(bar%8)/8))*(song.menu?.8:1);
    if(song.jingle)for(let eighth=0;eighth<8;eighth++)note(60,start+eighth*.5*beat,.14,.014*expression,'sleigh',eighth%2?.35:-.35);
    chord.slice(1,4).forEach((pitch,index)=>note(pitch,start,4.8*beat,.019*expression,'pad',(index-1)*.35));
    note(chord[0],start,2.6*beat,.065*expression,'bass',-.1);
    if(!song.sparse||bar%2===0)note(chord[0]+7,start+2.5*beat,1.4*beat,.027*expression,'bass',.08);
    const arpOrder=section%2?[1,3,2,4,3,2,4,2]:[1,2,3,4,2,3,4,3];
    for(let eighth=0;eighth<8;eighth++){
      if(song.sparse&&eighth%2===1)continue;
      const human=(random()-.5)*.018,swing=eighth%2?(song.swing||0)*beat:0;
      note(chord[arpOrder[eighth]],start+eighth*.5*beat+human+swing,1.45*beat,(song.arp==='bell'?.014:.03)*expression*(.9+random()*.2),song.arp,eighth%2?.35:-.35);
    }
    if(!(song.menu&&bar%4===3)){
      for(const [eighth,hold,index] of motifs[(bar+section)%motifs.length]){
        const pitch=chord[index]+12;
        note(pitch,start+eighth*.5*beat+(random()-.5)*.016,hold*.5*beat+1.05*beat,(song.lead==='bell'?.045:.075)*expression*(.9+random()*.15),song.lead,.1);
      }
    }
    // A quiet answering phrase in the second half keeps the longer arrangement evolving.
    if(section===2&&bar%2===1)note(chord[2],start+3*beat,1.8*beat,.035,'harp',-.35);
  }
  // Warm, damped stereo room reflections. Settle the circular delays before
  // retaining one period so the reverb tail is continuous across the music loop.
  const dryL=left.slice(),dryR=right.slice();
  for(const [seconds,feedback] of [[.071,.73],[.089,.70],[.113,.67],[.137,.64]]){
    const delay=Math.round(seconds*sampleRate),lineL=new Float32Array(delay),lineR=new Float32Array(delay);let lowL=0,lowR=0;
    for(let pass=0;pass<2;pass++)for(let i=0;i<length;i++){
      const cursor=i%delay,wetL=lineL[cursor],wetR=lineR[cursor];lowL=lowL*.3+wetL*.7;lowR=lowR*.3+wetR*.7;
      lineL[cursor]=dryL[i]+lowR*feedback;lineR[cursor]=dryR[i]+lowL*feedback;
      if(pass===1){left[i]+=wetL*.09;right[i]+=wetR*.09;}
    }
  }
  const seam=Math.round(.008*sampleRate);
  for(let i=0;i<seam;i++){const n=length-seam+i,mix=(i+1)/seam;left[n]=left[n]*(1-mix)+left[0]*mix;right[n]=right[n]*(1-mix)+right[0]*mix;}
  let peak=0,power=0;for(let i=0;i<length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));power+=left[i]**2+right[i]**2;}
  const rms=Math.sqrt(power/(length*2)),gain=Math.min((song.menu?.085:.105)/rms,.72/peak);
  const wav=Buffer.alloc(44+length*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*4,40);
  for(let i=0;i<length;i++){wav.writeInt16LE(Math.round(left[i]*gain*32767),44+i*4);wav.writeInt16LE(Math.round(right[i]*gain*32767),46+i*4);}
  return {wav,stats:{seconds:duration,peak:peak*gain,rms:rms*gain,loopStep:Math.max(Math.abs(left[0]-left[length-1]),Math.abs(right[0]-right[length-1]))*gain,bpm:song.bpm}};
}
(async()=>{
  const manifest=JSON.parse(await fs.readFile('test-results/music-samples/manifest.json','utf8'));
  for(const item of manifest){
    const decoded=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-i',path.resolve('test-results/music-samples',item.file),'-ar',String(sampleRate),'-ac','2','-f','f32le','pipe:1'],{windowsHide:true,maxBuffer:64*1024*1024});
    if(decoded.status!==0)throw Error(decoded.stderr.toString());
    const bytes=decoded.stdout,data=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value));if(peak<.001)throw Error('Silent sample '+item.file);
    for(let i=0;i<data.length;i++)data[i]*=.8/peak;recordings.push({...item,data});
  }
  await fs.mkdir('assets/music',{recursive:true});await fs.mkdir('test-results/music-renders',{recursive:true});const report=JSON.parse(await fs.readFile('assets/music/arrangements.json','utf8').catch(()=>'{}'));
  for(const [id,song] of Object.entries(scores)){
    if(process.argv.includes('--seasonal')&&!['snowfall','christmas-bells','halloween-waltz','candlelight','spring-bloom'].includes(id))continue;
    const {wav,stats}=render(id,song),file=path.resolve('test-results/music-renders',id+'.wav');await fs.writeFile(file,wav);
    const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-c:a','libvorbis','-q:a','4',path.resolve('assets/music',id+'.ogg')],{windowsHide:true,encoding:'utf8'});
    if(result.status!==0)throw Error(result.stderr||result.error?.message||'Music encoding failed');report[id]={...stats,renderer:'VCSL recorded instruments',sampleRate};console.log(id,JSON.stringify(stats));
  }
  await fs.writeFile('assets/music/arrangements.json',JSON.stringify(report,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
