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

// Original vector marks; no fonts, image downloads, or licensed tile artwork required.
export function standardArt(index) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 60 86');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('tile-standard');
  if(index===34){
    // A vermilion rabbit mark, drawn in the same small, flat palette as the suits.
    const mark=(tag,attributes)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);svg.append(node);return node;};
    const red='#bd392e',outline='#8e2e27',ivory='#fff5df';
    mark('path',{d:'M25 36 C16 27 15 10 20 8 C25 6 31 23 30 32 C31 21 36 7 41 10 C47 14 39 31 34 37',fill:red,stroke:outline,'stroke-width':1.5,'stroke-linejoin':'round'});
    mark('path',{d:'M22 14 Q22 24 27 30 M39 16 Q36 25 33 30',fill:'none',stroke:ivory,'stroke-width':2.5,'stroke-linecap':'round'});
    mark('circle',{cx:47,cy:58,r:7,fill:red,stroke:outline,'stroke-width':1.5});
    mark('path',{d:'M23 43 C33 38 45 46 45 59 C45 68 39 74 29 74 L16 74 Q11 73 14 69 L21 66 C14 61 15 50 23 43 Z',fill:red,stroke:outline,'stroke-width':1.5,'stroke-linejoin':'round'});
    mark('path',{d:'M33 55 C25 53 24 64 30 67 L38 68 M22 52 L19 66',fill:'none',stroke:'#e18d78','stroke-width':2,'stroke-linecap':'round'});
    mark('path',{d:'M35 35 C35 27 22 24 18 32 L13 38 Q9 42 16 45 C23 51 35 46 35 35 Z',fill:red,stroke:outline,'stroke-width':1.5,'stroke-linejoin':'round'});
    mark('ellipse',{cx:20,cy:35,rx:2.2,ry:2.7,fill:ivory});
    mark('circle',{cx:19.5,cy:35,r:1.1,fill:outline});
    mark('path',{d:'M12 39 L16 40 M17 44 Q20 45 22 42',fill:'none',stroke:ivory,'stroke-width':1.5,'stroke-linecap':'round'});
    return svg;
  }
  const name=standardName(index),count=Number(name.split(' ').at(-1));
  if(index>=18) {
    const text=document.createElementNS(ns,'text');text.setAttribute('x','30');text.setAttribute('y',index<27?'40':'56');text.setAttribute('text-anchor','middle');text.setAttribute('font-size',index<27?'32':'41');text.setAttribute('font-family','Microsoft YaHei, SimSun, Georgia, serif');
    text.setAttribute('fill',index>=31?['#a34f3e','#286849','#315f83'][index-31]:'#315f83');
    text.textContent=index<27?['一','二','三','四','五','六','七','八','九'][index-18]:index<31?['東','南','西','北'][index-27]:['中','發','白'][index-31];
    svg.append(text);
    if(index<27){const lower=text.cloneNode();lower.setAttribute('y','76');lower.setAttribute('fill','#a34f3e');lower.textContent='萬';svg.append(lower);}
    return svg;
  }
  const positions = {
    1: [[30,43]], 2: [[19,23],[41,63]], 3: [[17,20],[30,43],[43,66]],
    4: [[17,23],[43,23],[17,63],[43,63]],
    5: [[17,18],[43,18],[30,43],[17,68],[43,68]],
    6: [[17,18],[43,18],[17,43],[43,43],[17,68],[43,68]],
    7: [[15,14],[30,22],[45,30],[17,50],[43,50],[17,72],[43,72]],
    8: [[17,12],[43,12],[17,33],[43,33],[17,54],[43,54],[17,75],[43,75]],
    9: [[13,16],[30,16],[47,16],[13,43],[30,43],[47,43],[13,70],[30,70],[47,70]],
  };
  for (const [x,y] of positions[count]) {
    if (name.startsWith('Dots')) {
      for (const radius of [count===9?6:9,3]) {
        const circle = document.createElementNS(ns,'circle');
        for (const [key, value] of Object.entries({cx:x,cy:y,r:radius,fill:radius > 3 ? 'none' : '#a34f3e',stroke:radius > 3 ? '#315f83' : '#a34f3e','stroke-width':2.5})) circle.setAttribute(key,value);
        svg.append(circle);
      }
    } else {
      const path = document.createElementNS(ns,'path');
      path.setAttribute('d',`M${x-2} ${y-9} L${x+2} ${y+9} M${x-5} ${y-5} l7 -2 M${x-2} ${y+5} l7 -2`);
      path.setAttribute('stroke','#286849');path.setAttribute('stroke-width','4');path.setAttribute('stroke-linecap','round');
      svg.append(path);
    }
  }
  return svg;
}
