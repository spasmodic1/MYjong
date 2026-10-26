// Original synthesized compositions; no recordings, network or third-party music assets.
const compositions={
  garden:{notes:[60,64,67,71,69,67,64,62,57,60,64,67,65,64,62,59],beat:1250,duration:2.2,type:'sine'},
  river:{notes:[62,69,74,77,76,74,69,65,62,65,69,72,74,69,65,60],beat:650,duration:1.5,type:'triangle',bass:38},
  moonlight:{notes:[57,64,69,72,71,64,67,62,60,67,72,76,74,71,67,64],beat:1500,duration:3,type:'sine',bass:33},
  sunroom:{notes:[65,69,72,74,72,69,67,65,62,65,69,72,74,72,67,64],beat:900,duration:1.8,type:'triangle',bass:41},
  starlight:{notes:[72,79,76,83,81,76,79,74,71,78,74,81,79,74,76,72],beat:1400,duration:3.2,type:'sine',bell:true}
};
const frequency=midi=>440*2**((midi-69)/12);
export function createAudio(settings) {
  let context,musicTimer,signature=null,step=0;
  const voices=new Set();
  function ready(){context ||= new AudioContext();if(context.state==='suspended')context.resume();return context;}
  function note(freq,duration=.25,level=.08,delay=0,type='sine',music=false){
    if(settings().volume<=0)return;
    const ctx=ready(),osc=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+delay;
    osc.type=type;osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level*settings().volume,time+.03);
    gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain).connect(ctx.destination);
    const voice={osc,gain,music};voices.add(voice);
    osc.onended=()=>{voices.delete(voice);osc.disconnect();gain.disconnect();};
    osc.start(time);osc.stop(time+duration+.1);
  }
  function stopMusic(){
    clearInterval(musicTimer);musicTimer=null;
    for(const voice of voices)if(voice.music){
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setTargetAtTime(0,context.currentTime,.01);
      voice.osc.stop(context.currentTime+.04);
    }
  }
  function sync(){
    const s=settings(),next=JSON.stringify([s.music,s.musicTrack||'garden',s.volume,document.hidden]);
    if(next===signature)return;
    signature=next;stopMusic();step=0;
    if(!s.music||document.hidden||s.volume<=0)return;
    const song=compositions[s.musicTrack]||compositions.garden;
    const tick=()=>{
      const pitch=song.notes[step%song.notes.length];
      note(frequency(pitch),song.duration,song.type==='triangle'?.045:.07,0,song.type,true);
      if(song.bass&&step%4===0)note(frequency(song.bass+(step%8===4?7:0)),song.duration*1.5,.035,0,'sine',true);
      if(song.bell)note(frequency(pitch+12),1.4,.018,.04,'sine',true);
      step++;
    };
    tick();musicTimer=setInterval(tick,song.beat);
  }
  return {sync,play(kind){
    if(!settings().sound)return;
    if(kind==='win')[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,.8,.16,i*.16));
    else if(kind==='match'){note(659.25,.25,.16);note(880,.45,.12,.12);}
    else if(kind==='blocked')note(180,.12,.1);
    else note(440,.1,.06);
  },pause(){
    stopMusic();signature=null;
    for(const voice of voices)voice.osc.stop();
    context?.suspend();
  }};
}
