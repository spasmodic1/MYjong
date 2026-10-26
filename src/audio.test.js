import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from './audio.js';
test('music switches, mutes and pauses without accumulating loops or playing hidden',t=>{
  const previousContext=globalThis.AudioContext,previousDocument=globalThis.document,oscillators=[],intervals=new Map();let id=0;
  globalThis.document={hidden:false};
  globalThis.AudioContext=class{
    currentTime=0;state='running';destination={};
    createOscillator(){const osc={frequency:{value:0},stops:[],connect(){return this;},disconnect(){},start(){},stop(time){this.stops.push(time);if(time===undefined)this.onended?.();}};oscillators.push(osc);return osc;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}},connect(){return this;},disconnect(){}};}
    suspend(){this.state='suspended';}resume(){this.state='running';}
  };
  t.after(()=>{if(previousContext===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previousContext;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
  t.mock.method(globalThis,'setInterval',callback=>{intervals.set(++id,callback);return id;});
  t.mock.method(globalThis,'clearInterval',key=>intervals.delete(key));
  const settings={music:true,musicTrack:'garden',volume:.3,sound:true},audio=createAudio(()=>settings);
  audio.sync();assert.equal(intervals.size,1);assert.equal(oscillators.length,1);
  audio.sync();assert.equal(oscillators.length,1,'unrelated appearance changes do not restart music');
  const garden=oscillators[0];settings.musicTrack='river';audio.sync();assert.equal(intervals.size,1);assert.ok(garden.stops.includes(.04));assert.equal(oscillators[1].type,'triangle');
  for(const track of ['moonlight','sunroom','starlight']){settings.musicTrack=track;audio.sync();assert.equal(intervals.size,1);}
  settings.volume=0;audio.sync();const mutedCount=oscillators.length;audio.play('match');assert.equal(oscillators.length,mutedCount);assert.equal(intervals.size,0);
  settings.volume=.3;audio.sync();assert.equal(intervals.size,1);audio.pause();assert.equal(intervals.size,0);
  document.hidden=true;audio.sync();assert.equal(intervals.size,0);document.hidden=false;audio.sync();assert.equal(intervals.size,1);
  settings.music=false;audio.sync();assert.equal(intervals.size,0);
});
