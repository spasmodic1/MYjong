export function suggestedCrop(box, w, h, kind) {
  const [x,y,bw,bh]=box, face=kind==='person';
  const width=Math.max(bw*(face?1.9:1.15),bh*(face?2.2:1.15)*.8);
  const base=Math.min(w,h*.8), height=width/.8;
  if(width>base || width/w>.94 || height/h>.94) return null;
  const zoom=Math.min(5,base/width), actualWidth=base/zoom,actualHeight=actualWidth/.8;
  const cx=x+bw/2,cy=y+bh*(face?.55:.5);
  const clamp=v=>Math.max(0,Math.min(1,v));
  return {zoom,x: w===actualWidth?.5:clamp((cx-actualWidth/2)/(w-actualWidth)),y:h===actualHeight?.5:clamp((cy-actualHeight/2)/(h-actualHeight))};
}
export function distance(a,b) {
  if(!a || !b || a.length!==b.length) return Infinity;
  return Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0));
}
export function groupDetections(results) {
  const groups=[];
  for(const result of results) {
    // Pet species detection is not pet identity recognition. Never cluster pets by species.
    let group=result.kind==='person' && groups.find(g=>g.kind==='person' && g.items.every(r=>distance(r.descriptor,result.descriptor)<.48));
    if(!group) { group={kind:result.kind,items:[]};groups.push(group); }
    group.items.push(result);
  }
  return groups;
}
