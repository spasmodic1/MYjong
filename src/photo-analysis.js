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
export function distinctSubjects(animals,faces){
  const intersection=(a,b)=>Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
  const pets=[];
  for(const animal of [...animals].sort((a,b)=>b.score-a.score))if(!pets.some(p=>{const overlap=intersection(p.box,animal.box);return overlap/(p.box[2]*p.box[3]+animal.box[2]*animal.box[3]-overlap)>.65;}))pets.push(animal);
  return [...pets,...faces.filter(face=>!pets.some(p=>{
    const [x,y,w,h]=p.box,[fx,fy,fw,fh]=face.box,cx=fx+fw/2,cy=fy+fh/2;
    return cx>x-w*.2&&cx<x+w*1.2&&cy>y-h*.2&&cy<y+h*1.2||intersection(p.box,face.box)/(fw*fh)>.35;
  }))];
}
