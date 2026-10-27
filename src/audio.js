import {seasonalMusicTrack} from './seasonal.js';
// Original bundled arrangements for music; short synthesized tones remain for game feedback.
export function createAudio(settings,{scene=()=> 'game',onMusicError=()=>{}}={}){
  let context,active=null,fadeTimer=null;
  const players=new Map(),voices=new Set();
  const level=()=>Math.max(0,Math.min(1,settings().volume||0))*.8;
  function ready(){context ||= new AudioContext();if(context.state==='suspended')context.resume();return context;}
  function note(frequency,duration=.25,amount=.08,delay=0){
    if(settings().volume<=0)return;
    const ctx=ready(),osc=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime+delay;
    osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(amount*settings().volume,time+.03);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain).connect(ctx.destination);voices.add(osc);
    osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(time);osc.stop(time+duration+.1);
  }
  function stopMusic(){clearInterval(fadeTimer);fadeTimer=null;for(const player of players.values()){player.pause();player.volume=0;}active=null;}
  function sync(){
    const s=settings(),place=scene();
    if(!s.music||document.hidden||place==='paused'||s.volume<=0){stopMusic();return;}
    const track=seasonalMusicTrack(s)||(place==='menu'?(s.menuMusicTrack||'welcome'):(s.musicTrack||'garden'));
    let player=players.get(track);
    if(!player){player=new Audio(new URL(`../assets/music/${track}.ogg`,import.meta.url).href);player.loop=true;player.preload='auto';player.volume=0;players.set(track,player);}
    if(active===track&&!player.paused&&Math.abs(player.volume-level())<.001)return;
    active=track;
    if(player.paused)player.play().catch(error=>{if(error.name!=='AbortError'&&error.name!=='NotAllowedError')onMusicError('This tune could not be loaded. Please try another.');});
    clearInterval(fadeTimer);let ticks=0;
    const fade=()=>{
      ticks++;let settling=false;
      for(const [id,current] of players){const target=id===active?level():0,difference=target-current.volume;
        current.volume=ticks>=14||Math.abs(difference)<.001?target:current.volume+difference*.3;
        if(current.volume!==target)settling=true;
        if(target===0&&current.volume===0)current.pause();
      }
      if(!settling){clearInterval(fadeTimer);fadeTimer=null;}
    };
    fadeTimer=setInterval(fade,25);fade();
  }
  return {sync,play(kind){
    if(!settings().sound)return;
    if(kind==='win')[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,.8,.16,i*.16));
    else if(kind==='match'){note(659.25,.25,.16);note(880,.45,.12,.12);}
    else if(kind==='blocked')note(180,.12,.1);else note(440,.1,.06);
  },pause(){stopMusic();for(const voice of voices)voice.stop();context?.suspend();}};
}
