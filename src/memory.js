import {isFree} from './rules.js';
export function revealMemoryTile(game,selected=null,random=Math.random){
  const memory=game.memory;
  if(game.mode!=='memory'||game.recorded||!memory?.interval||game.elapsed<memory.nextAt)return null;
  memory.nextAt=game.elapsed+memory.interval;
  const choices=game.tiles.filter(t=>isFree(t,game.tiles)&&!memory.revealed.includes(t.id)&&t.id!==selected);
  if(!choices.length)return null;
  const tile=choices[Math.floor(random()*choices.length)];memory.revealed.push(tile.id);return tile.id;
}
