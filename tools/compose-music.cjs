// Original score and deterministic software instruments. No samples or external recordings.
const fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process');
const sampleRate=32000;
const scores={
  garden:{bpm:78,lead:'piano',arp:'harp',chords:[[48,60,64,67,71],[45,57,60,64,67],[41,53,57,60,64],[43,55,59,62,69]],seed:17},
  river:{bpm:94,lead:'harp',arp:'piano',chords:[[38,50,57,60,65],[46,58,62,65,69],[41,53,57,60,67],[43,55,60,62,67]],seed:29,swing:.055},
  moonlight:{bpm:66,lead:'piano',arp:'bell',chords:[[45,57,60,64,71],[41,53,57,60,64],[48,55,60,64,67],[43,55,59,62,69]],seed:43,sparse:true},
  sunroom:{bpm:92,lead:'piano',arp:'harp',chords:[[41,53,57,60,67],[38,50,53,57,60],[46,53,58,62,65],[48,55,60,64,67]],seed:61,swing:.035},
  starlight:{bpm:72,lead:'bell',arp:'harp',chords:[[48,60,64,67,74],[45,57,60,64,71],[41,53,57,60,67],[43,55,59,62,69]],seed:73,sparse:true},
  welcome:{bpm:70,lead:'piano',arp:'harp',chords:[[48,55,60,64,71],[41,53,57,60,67],[45,57,60,64,71],[43,55,59,62,69]],seed:101,sparse:true,menu:true}
};
const colors={
  piano:[[1,1,2.3],[2.002,.28,1.2],[3.008,.12,.65],[4.016,.035,.35]],
  harp:[[1,1,1.8],[2,.32,.8],[3,.13,.45],[4,.04,.25]],
  bell:[[1,1,2.8],[2.76,.15,1.7],[5.4,.025,.55]],
  pad:[[.9994,.5,99],[1.0006,.5,99],[2,.07,99],[3,.025,99]],
  bass:[[1,1,1.8],[2,.16,.7]]
};
function render(id,song){
  const beat=60/song.bpm,bars=32,duration=bars*4*beat,length=Math.round(duration*sampleRate),left=new Float32Array(length),right=new Float32Array(length);
  let seed=song.seed;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function note(midi,start,duration,level,instrument,pan=0){
    const frequency=440*2**((midi-69)/12),partials=colors[instrument],attack=instrument==='pad'?.55:instrument==='bass'?.035:.007;
    const voices=partials.map(([ratio,weight,decay])=>{const phase=2*Math.PI*frequency*ratio/sampleRate;return {s:0,c:1,ds:Math.sin(phase),dc:Math.cos(phase),amp:weight,decay:Math.exp(-1/(decay*sampleRate))};});
    const count=Math.round(duration*sampleRate),offset=Math.round(start*sampleRate),gainL=Math.sqrt((1-pan)/2)*level,gainR=Math.sqrt((1+pan)/2)*level;
    for(let i=0;i<count;i++){
      const time=i/sampleRate,envelope=Math.min(1,time/attack)*Math.min(1,(duration-time)/(instrument==='pad'?.8:.12));let value=0;
      for(const voice of voices){value+=voice.s*voice.amp;const s=voice.s*voice.dc+voice.c*voice.ds;voice.c=voice.c*voice.dc-voice.s*voice.ds;voice.s=s;voice.amp*=voice.decay;}
      value*=Math.max(0,envelope);const index=((offset+i)%length+length)%length;left[index]+=value*gainL;right[index]+=value*gainR;
    }
  }
  const motifs=[[[0,2,2],[3,1,3],[4,2,4],[7,1,2]],[[0,3,3],[3,1,2],[5,2,1]],[[1,2,2],[4,1,3],[5,2,4],[7,1,3]],[[0,2,2],[2,2,1],[5,3,2]]];
  for(let bar=0;bar<bars;bar++){
    const chord=song.chords[bar%4],start=bar*4*beat,section=Math.floor(bar/8),expression=(.82+.16*Math.sin(Math.PI*(bar%8)/8))*(song.menu?.8:1);
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
  const dryL=left.slice(),dryR=right.slice();
  for(const [seconds,gain] of [[.173,.16],[.293,.12],[.431,.08],[.677,.045]]){
    const delay=Math.round(seconds*sampleRate);
    for(let i=0;i<length;i++){const source=(i-delay+length)%length;left[i]+=dryR[source]*gain;right[i]+=dryL[source]*gain;}
  }
  let peak=0,power=0;for(let i=0;i<length;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));power+=left[i]**2+right[i]**2;}
  const rms=Math.sqrt(power/(length*2)),gain=Math.min((song.menu?.085:.105)/rms,.72/peak);
  const wav=Buffer.alloc(44+length*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(sampleRate,24);wav.writeUInt32LE(sampleRate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(length*4,40);
  for(let i=0;i<length;i++){wav.writeInt16LE(Math.round(left[i]*gain*32767),44+i*4);wav.writeInt16LE(Math.round(right[i]*gain*32767),46+i*4);}
  return {wav,stats:{seconds:duration,peak:peak*gain,rms:rms*gain,loopStep:Math.max(Math.abs(left[0]-left[length-1]),Math.abs(right[0]-right[length-1]))*gain,bpm:song.bpm}};
}
(async()=>{
  await fs.mkdir('assets/music',{recursive:true});await fs.mkdir('test-results/music-renders',{recursive:true});const report={};
  for(const [id,song] of Object.entries(scores)){
    const {wav,stats}=render(id,song),file=path.resolve('test-results/music-renders',id+'.wav');await fs.writeFile(file,wav);
    const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-c:a','libvorbis','-q:a','4',path.resolve('assets/music',id+'.ogg')],{windowsHide:true,encoding:'utf8'});
    if(result.status!==0)throw Error(result.stderr||result.error?.message||'Music encoding failed');report[id]=stats;console.log(id,JSON.stringify(stats));
  }
  await fs.writeFile('assets/music/arrangements.json',JSON.stringify(report,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
