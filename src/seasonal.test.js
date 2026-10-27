import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seasons,normalizeSeasonal,currentSeason,seasonalFace,seasonalBackground,seasonalMusicTrack,usesSeasonalFace} from './seasonal.js';
import {existsSync} from 'node:fs';
test('monthly defaults, opt-outs, alternates and local year rollover',()=>{
 const s=normalizeSeasonal({});
 for(let m=0;m<12;m++)assert.equal(currentSeason(s,new Date(2026,m,15)).id,seasons[m].id);
 s.seasonalEnabled=s.seasonalEnabled.filter(id=>id!=='halloween');assert.equal(currentSeason(s,new Date(2026,9,31)),null);
 s.seasonalEnabled.push('hanukkah');s.seasonalPreferred[11]='hanukkah';assert.equal(currentSeason(s,new Date(2026,11,1)).id,'hanukkah');
 assert.equal(currentSeason(s,new Date(2027,0,1)).id,'snow');s.seasonalMode=false;assert.equal(currentSeason(s),null);
});
test('all 35 identities stay visually and accessibly distinct in every theme',()=>{
 for(const t of seasons){assert.ok(seasonalBackground(t).includes(t.id+'.webp'));assert.ok(existsSync(new URL(`../assets/seasonal/${t.id}.webp`,import.meta.url)),t.id+' background');const faces=Array.from({length:35},(_,i)=>seasonalFace(t,i));assert.equal(new Set(faces.map(f=>f.symbol+f.number)).size,35,t.id);assert.equal(new Set(faces.map(f=>f.name)).size,35,t.id);}
});
test('seasonal music follows the selected theme, opt-outs and mode without replacing chosen tunes',()=>{
 const s=normalizeSeasonal({musicTrack:'river',menuMusicTrack:'garden'});
 for(const [month,track] of [[0,'snowfall'],[3,'spring-bloom'],[4,'spring-bloom'],[9,'halloween-waltz'],[11,'christmas-bells']]){
  assert.equal(seasonalMusicTrack(s,new Date(2026,month,1)),track);
  assert.ok(existsSync(new URL(`../assets/music/${track}.ogg`,import.meta.url)));
 }
 s.seasonalEnabled.push('hanukkah');s.seasonalPreferred[11]='hanukkah';assert.equal(seasonalMusicTrack(s,new Date(2026,11,1)),'candlelight');
 s.seasonalMusic=false;assert.equal(seasonalMusicTrack(s,new Date(2026,11,1)),null);
 s.seasonalMusic=true;s.seasonalMode=false;assert.equal(seasonalMusicTrack(s,new Date(2026,11,1)),null);
 assert.equal(s.musicTrack,'river');assert.equal(s.menuMusicTrack,'garden');
});
test('older settings migrate and invalid seasonal preferences are repaired',()=>{
 const s=normalizeSeasonal({seasonalEnabled:['bad','snow','snow'],seasonalPreferred:{11:'snow'},seasonalMode:'bad'});
 assert.deepEqual(s.seasonalEnabled,['snow']);assert.deepEqual(s.seasonalPreferred,{});assert.equal(s.seasonalMode,true);
 assert.deepEqual(normalizeSeasonal({seasonalEnabled:[]}).seasonalEnabled,[]);
});
test('mixed faces are deterministic by identity and all-seasonal remains available',()=>{
 const s=normalizeSeasonal({});assert.equal(s.seasonalFaceMix,'mixed');
 assert.equal(Array.from({length:35},(_,i)=>usesSeasonalFace(s,i)).filter(Boolean).length,18);
 for(let i=0;i<35;i++)assert.equal(usesSeasonalFace(s,i),i%2===0);
 s.seasonalFaceMix='all';assert.ok(Array.from({length:35},(_,i)=>usesSeasonalFace(s,i)).every(Boolean));
 s.seasonalTiles=false;assert.ok(Array.from({length:35},(_,i)=>usesSeasonalFace(s,i)).every(v=>!v));
});
