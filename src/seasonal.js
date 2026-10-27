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
// Each traditional identity keeps a unique symbol + number combination (7 × 5).
export function seasonalFace(season,index){const face=season.faces[index%7],number=Math.floor(index/7)+1;return {...face,number,name:`${face.name} ${number}`};}
// Decide by identity, so every copy of a matching face uses the same artwork.
export const usesSeasonalFace=(settings,index)=>settings.seasonalTiles&&(settings.seasonalFaceMix==='all'||index%2===0);
export function seasonalArt(season,index){
 const face=seasonalFace(season,index),node=document.createElement('span');node.className='seasonal-face';node.setAttribute('aria-hidden','true');
 const symbol=document.createElement('span');symbol.className='seasonal-symbol';symbol.append(seasonalImage(season,index));
 const number=document.createElement('span');number.className='seasonal-number';number.textContent=face.number;
 node.append(symbol,number);return node;
}
export const seasonalBackground=season=>`url("${new URL(`../assets/seasonal/${season.id}.webp`,import.meta.url).href}")`;
export const seasonalTracks={snow:'snowfall',christmas:'christmas-bells',halloween:'halloween-waltz',hanukkah:'candlelight',spring:'spring-bloom',easter:'spring-bloom',solstice:'snowfall'};
export function seasonalMusicTrack(settings,date=new Date()){
 if(settings.seasonalMusic===false)return null;
 const season=currentSeason({...settings,seasonalEnabled:settings.seasonalEnabled||[],seasonalPreferred:settings.seasonalPreferred||{}},date);
 return season?seasonalTracks[season.id]||null:null;
}

export const seasonalImageUrl=(season,index)=>new URL(`../assets/seasonal/tiles/${season.id}/${index%7}.webp`,import.meta.url).href;
export const seasonalIconIndex=season=>({valentine:6,easter:1,spring:1,july:1,school:1,halloween:1,christmas:2}[season.id]||0);
export function seasonalImage(season,index=0){
 const image=document.createElement('img');image.className='seasonal-illustration';
 image.src=seasonalImageUrl(season,index);image.alt='';image.draggable=false;image.decoding='async';return image;
}
