const define=(id,month,name,icon,bg,accent,tint,faces)=>({id,month,name,icon,bg,accent,tint,faces:faces.split('|').map(s=>{const [symbol,...name]=s.split(' ');return {symbol,name:name.join(' ')};})});
export const seasons=[
 define('snow',0,'Snow','❄️','#193f59','#a8dcf1','#deeffa','❄️ Snowflake|⛄ Snowman|⚪ Snowball|🧤 Mittens|🧣 Scarf|🛷 Sled|@shovel Snow shovel'),
 define('valentine',1,"Valentine’s Day",'💝','#602a46','#f2aecb','#fae1eb','❤️ Heart|💐 Bouquet|💌 Love letter|🎀 Ribbon|🍫 Chocolate|🌹 Rose|💝 Heart gift'),
 define('patrick',2,"St. Patrick’s Day",'☘️','#154b37','#b9df89','#e0efd5','☘️ Shamrock|🍀 Clover|🌈 Rainbow|🪙 Gold coin|@leprechaun Leprechaun|@goldpot Pot of gold|🎻 Fiddle'),
 define('easter',3,'Easter','🐰','#493f68','#e5c6ee','#f2e8fa','🥚 Egg|🐰 Bunny|🧺 Basket|🐣 Chick|🥕 Carrot|🌷 Tulip|🎀 Easter ribbon'),
 define('spring',4,'Spring','🌷','#285345','#e6d697','#ebf1d8','🌸 Blossom|🌷 Tulip|☀️ Sunshine|🦋 Butterfly|🐝 Bee|🌱 Seedling|🐞 Ladybug'),
 define('summer',5,'Summer','🏖️','#15576a','#f4d89a','#e0f4f4','🏖️ Beach|⛱️ Umbrella|🕶️ Sunglasses|🐚 Seashell|🍉 Watermelon|🍦 Ice cream|🏄 Surfboard'),
 define('july',6,'Fourth of July','🎆','#233e66','#f2c7bb','#eff0fc','🦅 Bald eagle|🎆 Fireworks|@usa USA|⭐ Star|🗽 Liberty|🎉 Celebration|🥧 Pie'),
 define('school',7,'Back to School','📚','#394953','#efce91','#fff0d6','🍎 Apple|📚 Books|✏️ Pencil|🎒 Backpack|📏 Ruler|🖍️ Crayon|🔔 School bell'),
 define('autumn',8,'Autumn','🍁','#67402b','#edc184','#faead3','🍁 Maple leaf|🍂 Fallen leaves|🎃 Pumpkin|🌰 Chestnut|🍄 Mushroom|🍎 Apple|🦊 Fox'),
 define('halloween',9,'Halloween','🎃','#382b50','#ffc47c','#f4e3d2','👻 Ghost|🎃 Jack-o’-lantern|🍬 Candy|🦇 Bat|🕷️ Spider|🧙 Witch|🐈‍⬛ Black cat'),
 define('thanksgiving',10,'Thanksgiving','🦃','#543c2c','#f0cc91','#f7e8cc','🦃 Turkey|🌽 Corn|🥧 Pumpkin pie|@pilgrim Pilgrim hat|🧺 Harvest basket|🍐 Pear|🍠 Sweet potato'),
 define('christmas',11,'Christmas','🎄','#1b493c','#f0d19a','#f8eddd','🎅 Santa|🎁 Present|🎄 Christmas tree|@candycane Candy cane|🔔 Bell|🦌 Reindeer|🍪 Cookie'),
 define('hanukkah',11,'Hanukkah','🕎','#263c68','#c7dafa','#e9effb','🕎 Hanukkiah|✡️ Star of David|🕯️ Candle|🪙 Gelt|🎁 Gift|🏺 Oil jug|@dreidel Dreidel'),
 define('lunar',1,'Lunar New Year','🏮','#682e2d','#f3d187','#f9ebd4','🏮 Lantern|🧧 Red envelope|🐉 Dragon|🥟 Dumpling|🍊 Mandarin|🪭 Fan|🎋 Bamboo'),
 define('earth',3,'Earth Day','🌎','#204c49','#b5dfbd','#e1f1e3','🌎 Earth|🌱 Seedling|🌳 Tree|♻️ Recycling|💧 Water|🐢 Turtle|🌻 Sunflower'),
 define('summer-nights',7,'Summer Nights','🌙','#282f53','#d7cef5','#e9e5f7','🌙 Moon|⭐ Star|🏕️ Camping|🔥 Campfire|🦉 Owl|🔭 Telescope|🌌 Milky Way'),
 define('harvest',10,'Harvest','🌾','#53432b','#edd397','#f5ebd4','🌾 Wheat|🍎 Apple|🌽 Corn|🧺 Basket|🍇 Grapes|🍐 Pear|🥕 Carrot'),
 define('solstice',11,'Winter Solstice','🌲','#243f4a','#c6dfe5','#e4eff0','🌲 Evergreen|❄️ Snowflake|🕯️ Candle|🌙 Moon|⭐ Star|🦌 Deer|🪵 Yule log')
];
export const seasonalDefaults=()=>({seasonalMode:true,seasonalBackground:true,seasonalTiles:true,seasonalMusic:true,seasonalFaceMix:'mixed',seasonalEnabled:seasons.slice(0,12).map(s=>s.id),seasonalPreferred:{}});
export function normalizeSeasonal(s){
 const d=seasonalDefaults();
 for(const k of ['seasonalMode','seasonalBackground','seasonalTiles','seasonalMusic'])if(typeof s[k]!=='boolean')s[k]=d[k];
 if(!['mixed','all'].includes(s.seasonalFaceMix))s.seasonalFaceMix='mixed';
 s.seasonalEnabled=Array.isArray(s.seasonalEnabled)?[...new Set(s.seasonalEnabled.filter(id=>seasons.some(t=>t.id===id)))]:d.seasonalEnabled;
 s.seasonalPreferred=s.seasonalPreferred&&typeof s.seasonalPreferred==='object'&&!Array.isArray(s.seasonalPreferred)?Object.fromEntries(Object.entries(s.seasonalPreferred).filter(([m,id])=>seasons.some(t=>String(t.month)===m&&t.id===id))):{};
 return s;
}
export function currentSeason(s,date=new Date()){
 if(!s.seasonalMode)return null;
 const choices=seasons.filter(t=>t.month===date.getMonth()&&s.seasonalEnabled.includes(t.id));
 return choices.find(t=>t.id===s.seasonalPreferred[date.getMonth()])||choices[0]||null;
}
// One matching identity per illustration. No numbered variants.
export const seasonalIndices=[0,8,2,10,4,12,6];
export const seasonalPictureIndices=[...seasonalIndices,34];
export const seasonalRabbits={snow:'snow',valentine:'valentine',patrick:'patrick',easter:'easter',spring:'spring',summer:'summer',july:'july',school:'school',earth:'spring','summer-nights':'summer',solstice:'snow'};
export function seasonalFace(season,index){return index===34?{symbol:'🐇',name:'Red rabbit'}:{...season.faces[index%7]};}
export const usesSeasonalFace=(settings,index)=>settings.seasonalTiles&&(settings.seasonalFaceMix==='all'||seasonalPictureIndices.includes(index));
export function seasonalSnapshot(settings,date=new Date()){
 const s=normalizeSeasonal({...settings}),theme=currentSeason(s,date);
 return {theme:theme?.id||null,tiles:Boolean(theme&&s.seasonalTiles),background:Boolean(theme&&s.seasonalBackground),mix:s.seasonalFaceMix,finish:true};
}
export const gameSeason=game=>seasons.find(s=>s.id===game?.seasonal?.theme)||null;
export const gameSeasonSettings=game=>({seasonalTiles:Boolean(game?.seasonal?.tiles),seasonalFaceMix:game?.seasonal?.mix||'mixed'});
export const validSeasonalSnapshot=s=>s===undefined||s&&typeof s==='object'&&(s.theme===null||seasons.some(t=>t.id===s.theme))&&typeof s.tiles==='boolean'&&typeof s.background==='boolean'&&['mixed','all'].includes(s.mix)&&(s.theme!==null||!s.tiles&&!s.background);
export function migrateSeasonalGame(game,settings){
 if(game.seasonal!==undefined)return false;
 game.seasonal=seasonalSnapshot(settings);
 if(!game.seasonal.tiles)return true;
 // Collapse 0.9.9's numbered pictures in the board and all undo snapshots.
 const map=tile=>{if(tile.face>=10){const index=tile.face-10;if(game.seasonal.mix==='all'||index%2===0)tile.face=10+seasonalIndices[index%7];}};
 game.tiles.forEach(map);
 for(const entry of game.history){entry.tiles?.forEach(map);if(entry.swapped)map(entry.swapped);}
 let rewind=game.tiles.map(t=>({...t}));
 for(const entry of [...game.history].reverse()){
  if(entry.type==='match')for(const id of entry.ids)rewind.find(t=>t.id===id).removed=false;
  else if(entry.type==='shuffle')rewind=entry.tiles.map(t=>({...t}));
  else if(entry.type==='arrival'){
   const current=entry.tiles.map(t=>rewind.find(c=>c.id===t.id));
   if(entry.mixed===true&&current[0].face===current[1].face)delete entry.mixed;
   if(entry.swapped)Object.assign(rewind.find(t=>t.id===entry.swapped.id),entry.swapped);
   for(const before of entry.tiles)Object.assign(rewind.find(t=>t.id===before.id),before);
  }
 }
 return true;
}
export function seasonalArt(season,index){
 const node=document.createElement('span');node.className='seasonal-face';node.setAttribute('aria-hidden','true');
 const symbol=document.createElement('span');symbol.className='seasonal-symbol';symbol.append(seasonalImage(season,index));
 node.append(symbol);return node;
}
export const seasonalBackground=season=>`url("${new URL(`../assets/seasonal/${season.id}.webp`,import.meta.url).href}")`;
export const seasonalTracks={snow:'snowfall',christmas:'christmas-bells',halloween:'halloween-waltz',hanukkah:'candlelight',spring:'spring-bloom',easter:'spring-bloom',solstice:'snowfall'};
export function seasonalMusicTrack(settings,date=new Date()){
 if(settings.seasonalMusic===false)return null;
 const season=currentSeason({...settings,seasonalEnabled:settings.seasonalEnabled||[],seasonalPreferred:settings.seasonalPreferred||{}},date);
 return season?seasonalTracks[season.id]||null:null;
}

export const seasonalImageUrl=(season,index)=>new URL(index===34?(seasonalRabbits[season.id]?`../assets/seasonal/rabbits/${seasonalRabbits[season.id]}.webp`:'../assets/tiles/traditional/34.webp'):`../assets/seasonal/tiles/${season.id}/${index%7}.webp`,import.meta.url).href;
export const seasonalIconIndex=season=>({valentine:6,easter:1,spring:1,july:1,school:1,halloween:1,christmas:2}[season.id]||0);
export function seasonalImage(season,index=0){
 const image=document.createElement('img');image.className='seasonal-illustration';
 image.src=seasonalImageUrl(season,index);image.alt='';image.draggable=false;image.decoding='async';return image;
}
