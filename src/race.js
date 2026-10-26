import {isFree} from './rules.js';
export const validRaceInterval=value=>Number.isInteger(value)&&value>=5&&value<=120;
export const raceNextAt=race=>(race.firstAt??race.interval)+race.waves*race.interval;
export const raceFinished=game=>game.mode==='race'&&game.race?.ended;
export function addRacePair(game,random=Math.random){
  const active=game.tiles.filter(t=>!t.removed),available=game.tiles.filter(t=>t.removed&&
    (t.z===0||active.some(b=>b.x===t.x&&b.y===t.y&&b.z===t.z-1))&&
    isFree({...t,removed:false},[...active,{...t,removed:false}]));
  for(let i=available.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
  let placement=null;
  search:for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++){
    const a=available[i],b=available[j];a.removed=b.removed=false;
    const safe=isFree(a,game.tiles)&&isFree(b,game.tiles);
    const partners=safe?active.filter(tile=>isFree(tile,game.tiles)):[];
    a.removed=b.removed=true;
    if(!safe)continue;
    placement??={a,b,partners};
    if(partners.length){placement={a,b,partners};break search;}
  }
  if(!placement)return [];
  const {a,b,partners}=placement,before=[{...a},{...b}];
  // Match an existing open tile without changing any tile already on the board.
  // Adding equal faces keeps counts even, so the new tiles cannot strand a face.
  const choices=partners.length?partners:game.tiles;
  const face=choices[Math.floor(random()*choices.length)].face;
  for(const tile of [a,b]){tile.removed=false;tile.face=face;if(face<10)tile.variant=Math.floor(random()*game.photos[face].variants.length);else delete tile.variant;}
  game.history.push({type:'arrival',tiles:before});game.race.waves++;game.race.nextAt=raceNextAt(game.race);
  return [a.id,b.id];
}
export function advanceRace(game,seconds,random=Math.random){
  const result={added:[],lost:false};
  if(game.recorded||raceFinished(game))return result;
  game.elapsed+=seconds;
  while(game.elapsed>=game.race.nextAt){
    const ids=addRacePair(game,random);
    if(!ids.length){game.race.ended=true;result.lost=true;break;}
    result.added.push(...ids);game.race.nextAt=raceNextAt(game.race);
  }
  return result;
}
