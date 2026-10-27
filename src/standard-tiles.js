export const standardTileCount=35;
export function standardName(index) {
  if(index===34)return 'Red rabbit';
  if(index<10)return `${index<5?'Dots':'Bamboo'} ${index%5+1}`;
  if(index<14)return `Dots ${index-4}`;
  if(index<18)return `Bamboo ${index-8}`;
  if(index<27)return `Characters ${index-17}`;
  if(index<31)return `${['East','South','West','North'][index-27]} wind`;
  return `${['Red','Green','White'][index-31]} dragon`;
}

// Bundled painted artwork keeps classic identities, counts and matching rules intact.
export const standardImageUrl=index=>new URL(`../assets/tiles/traditional/${index}.webp`,import.meta.url).href;
export function standardArt(index) {
  const image=document.createElement('img');
  image.className='tile-standard';image.src=standardImageUrl(index);
  image.alt='';image.draggable=false;image.decoding='async';
  return image;
}
