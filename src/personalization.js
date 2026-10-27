export const musicChoices=[['garden','Garden walk'],['river','Flowing water'],['moonlight','Moonlight'],['sunroom','Sunlit morning'],['starlight','Starlight'],['welcome','Welcome home'],['snowfall','Snowfall'],['christmas-bells','Christmas bells'],['halloween-waltz','Midnight garden'],['candlelight','Festival candlelight'],['spring-bloom','Spring bloom']];
export const tileColors=[['classic','Classic'],['jade','Soft jade'],['sky','Powder blue'],['rose','Blush pink'],['lavender','Lavender']];
export const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function backgroundInk(color){
  const channels=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=channels.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return (luminance+.05)/.05>=1.05/(luminance+.05)?'#000000':'#ffffff';
}
