export function standardName(index) {
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
