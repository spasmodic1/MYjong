import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seasons,normalizeSeasonal,currentSeason,seasonalFace,seasonalBackground,seasonalMusicTrack,usesSeasonalFace,seasonalIndices,migrateSeasonalGame} from './seasonal.js';
import {existsSync} from 'node:fs';
import {makeGame,defaults,emptyStats,validState,reshuffle} from './game.js';
import {pairs} from './rules.js';
import {addRacePair} from './race.js';
test('monthly defaults, opt-outs, alternates and local year rollover',()=>{
 const s=normalizeSeasonal({});
 for(let m=0;m<12;m++)assert.equal(currentSeason(s,new Date(2026,m,15)).id,seasons[m].id);
 s.seasonalEnabled=s.seasonalEnabled.filter(id=>id!=='halloween');assert.equal(currentSeason(s,new Date(2026,9,31)),null);
 s.seasonalEnabled.push('hanukkah');s.seasonalPreferred[11]='hanukkah';assert.equal(currentSeason(s,new Date(2026,11,1)).id,'hanukkah');
 assert.equal(currentSeason(s,new Date(2027,0,1)).id,'snow');s.seasonalMode=false;assert.equal(currentSeason(s),null);
});
test('every theme has seven plain named pictures with one matching identity each',()=>{
 for(const t of seasons){assert.ok(seasonalBackground(t).includes(t.id+'.webp'));assert.ok(existsSync(new URL(`../assets/seasonal/${t.id}.webp`,import.meta.url)),t.id+' background');const faces=seasonalIndices.map(i=>seasonalFace(t,i));assert.equal(new Set(faces.map(f=>f.name)).size,7,t.id);assert.ok(faces.every(f=>!('number' in f)&&! /\d/.test(f.name)));}
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
 assert.equal(Array.from({length:35},(_,i)=>usesSeasonalFace(s,i)).filter(Boolean).length,7);
 for(let i=0;i<35;i++)assert.equal(usesSeasonalFace(s,i),seasonalIndices.includes(i));
 s.seasonalFaceMix='all';assert.ok(Array.from({length:35},(_,i)=>usesSeasonalFace(s,i)).every(Boolean));
 s.seasonalTiles=false;assert.ok(Array.from({length:35},(_,i)=>usesSeasonalFace(s,i)).every(v=>!v));
});
test('new puzzles use unique picture identities and keep their theme when future preferences change',()=>{
 const settings=normalizeSeasonal({...defaults,collection:'traditional',difficulty:3,seasonalFaceMix:'all'}),library={photos:[],subjects:[]};
 const game=makeGame(settings,library),faces=[...new Set(game.tiles.map(t=>t.face))];
 assert.equal(faces.length,7);assert.equal(new Set(faces.map(f=>seasonalFace(seasons[0],f-10).name)).size,7);
 const skin=structuredClone(game.seasonal);settings.seasonalMode=false;settings.seasonalFaceMix='mixed';assert.deepEqual(game.seasonal,skin);
 const next=makeGame(settings,library);assert.equal(next.seasonal.theme,null);assert.equal(new Set(next.tiles.map(t=>t.face)).size,35);
 settings.seasonalMode=true;const mixed=makeGame(settings,library);const distinct=[...new Set(mixed.tiles.map(t=>t.face))];
 assert.equal(distinct.filter(f=>usesSeasonalFace(settings,f-10)).length,7);assert.equal(distinct.length,14);
});
test('numbered saves migrate matching identities together with undo and shuffle history',()=>{
 const settings=normalizeSeasonal({...defaults,collection:'traditional',difficulty:3,seasonalFaceMix:'all'}),game=makeGame({...settings,seasonalMode:false},{photos:[],subjects:[]});delete game.seasonal;
 const match=pairs(game.tiles)[0];match.forEach(t=>t.removed=true);game.history.push({type:'match',ids:match.map(t=>t.id)});
 const before=structuredClone(game.tiles);assert.equal(reshuffle(game),true);game.history.push({type:'shuffle',tiles:before});
 const state={version:2,settings,stats:emptyStats(),game};assert.equal(validState(state),true);assert.equal(migrateSeasonalGame(game,settings),true);assert.equal(validState(state),true);
 assert.ok(game.tiles.every(t=>seasonalIndices.includes(t.face-10)));assert.equal(migrateSeasonalGame(game,settings),false);
 assert.equal(reshuffle(game),true);
});
test('migration repairs mixed race arrivals that now share a single picture',()=>{
 const settings=normalizeSeasonal({...defaults,collection:'traditional',mode:'race',seasonalFaceMix:'all'}),game=makeGame({...settings,seasonalMode:false},{photos:[],subjects:[]});delete game.seasonal;
 game.tiles=Array.from({length:6},(_,id)=>({id,x:id%2*3+1,y:Math.floor(id/2),z:0,face:10+Math.floor(id/2)*14,removed:id<2}));game.initialSolution=[[0,1],[2,3],[4,5]];game.history=[{type:'match',ids:[0,1]}];
 assert.equal(addRacePair(game,()=>.4).length,2);assert.equal(game.history.at(-1).mixed,true);
 const state={version:2,settings,stats:emptyStats(),game};assert.equal(validState(state),true);migrateSeasonalGame(game,settings);assert.equal(game.history.at(-1).mixed,undefined);assert.equal(validState(state),true);
});
