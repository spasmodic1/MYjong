// Exact search runs in a worker. A time/node limit returns unknown, never "lost".
export function solveBoard(tiles,{deadline=performance.now()+3000,maxNodes=250000,witness}={}){
  const bits=tiles.map((_,i)=>1n<<BigInt(i)),above=tiles.map(()=>0n),left=[...above],right=[...above],impact=tiles.map(()=>0),byId=new Map(tiles.map((t,i)=>[t.id,i]));
  let initial=0n,nodes=0;
  for(let i=0;i<tiles.length;i++){
    if(!tiles[i].removed)initial|=bits[i];
    for(let j=0;j<tiles.length;j++)if(i!==j){
      const a=tiles[i],b=tiles[j];
      if(b.z>a.z&&Math.abs(a.x-b.x)<1&&Math.abs(a.y-b.y)<1){above[i]|=bits[j];impact[j]++;}
      if(b.z===a.z&&Math.abs(a.y-b.y)<1){if(Math.abs(b.x-a.x+1)<.01)left[i]|=bits[j];if(Math.abs(b.x-a.x-1)<.01)right[i]|=bits[j];}
    }
  }
  const free=(i,mask)=>(mask&bits[i])!==0n&&!(mask&above[i])&&(!(mask&left[i])||!(mask&right[i]));
  if(witness){
    let mask=initial;const path=[];let valid=true;
    for(const pair of witness){
      const a=byId.get(pair[0]),b=byId.get(pair[1]);
      if(a===undefined||b===undefined||a===b){valid=false;break;}
      if(!(mask&bits[a])&&!(mask&bits[b]))continue;
      if(tiles[a].face!==tiles[b].face||!free(a,mask)||!free(b,mask)){valid=false;break;}
      mask&=~(bits[a]|bits[b]);path.push(pair);
    }
    if(valid&&mask===0n)return {status:'solvable',path,nodes};
  }
  const dead=new Set(),limit={};
  function search(mask){
    if(mask===0n)return [];
    if(++nodes>maxNodes||nodes%64===1&&performance.now()>deadline)throw limit;
    if(dead.has(mask))return null;
    const groups=new Map(),counts=new Map();
    for(let i=0;i<tiles.length;i++)if(mask&bits[i]){
      const face=tiles[i].face;counts.set(face,(counts.get(face)||0)+1);
      if(free(i,mask)){if(!groups.has(face))groups.set(face,[]);groups.get(face).push(i);}
    }
    if([...counts.values()].some(count=>count%2)){dead.add(mask);return null;}
    // Removing every copy of an entirely free face cannot spoil another solution.
    for(const [face,indices] of groups)if(indices.length===counts.get(face)&&indices.length>=2){
      let next=mask;const forced=[];
      for(let i=0;i<indices.length;i+=2){next&=~(bits[indices[i]]|bits[indices[i+1]]);forced.push([tiles[indices[i]].id,tiles[indices[i+1]].id]);}
      const rest=search(next);if(rest)return [...forced,...rest];dead.add(mask);return null;
    }
    const choices=[];
    for(const indices of groups.values())for(let i=0;i<indices.length;i++)for(let j=i+1;j<indices.length;j++)choices.push([indices[i],indices[j]]);
    choices.sort((a,b)=>impact[b[0]]+impact[b[1]]-impact[a[0]]-impact[a[1]]);
    for(const [a,b] of choices){const rest=search(mask&~(bits[a]|bits[b]));if(rest)return [[tiles[a].id,tiles[b].id],...rest];}
    dead.add(mask);return null;
  }
  try{const path=search(initial);return {status:path?'solvable':'unsolvable',path,nodes};}
  catch(error){if(error!==limit)throw error;return {status:'unknown',nodes};}
}
export function analyzeDeadEnd(snapshot,{maxMs=8000,maxNodes=250000}={}){
  const history=snapshot.history,deadline=performance.now()+maxMs;
  const boardAt=index=>{
    let tiles=snapshot.tiles.map(t=>({...t})),byId=new Map(tiles.map(t=>[t.id,t]));
    for(let i=history.length-1;i>=index;i--){
      const entry=history[i];
      if(entry.type==='match')for(const id of entry.ids)byId.get(id).removed=false;
      else if(entry.type==='shuffle'){tiles=entry.tiles.map(t=>({...t}));byId=new Map(tiles.map(t=>[t.id,t]));}
      else if(entry.type==='arrival')for(const before of entry.tiles)Object.assign(byId.get(before.id),before);
    }
    return tiles;
  };
  const cache=new Map();
  const check=index=>{
    if(!cache.has(index))cache.set(index,solveBoard(boardAt(index),{deadline,maxNodes,witness:snapshot.initialSolution}));
    return cache.get(index).status;
  };
  let safe=check(0)==='solvable'?0:null,high=history.length;
  const result=(index,exact)=>index===null?null:{rollbackAt:index,tiles:boardAt(index),exact,move:history.slice(0,index).filter(e=>e.type==='match').length+1};
  while(high>0){
    let boundary=high-1;while(boundary>=0&&history[boundary].type==='match')boundary--;
    let low=boundary+1;const status=check(low);
    if(status==='unknown')return result(safe,false);
    if(status==='unsolvable'){if(low===0)break;high=low-1;continue;}
    safe=low;
    while(high-low>1){
      const middle=Math.floor((low+high)/2),status=check(middle);
      if(status==='unknown')return result(safe,false);
      if(status==='solvable')safe=low=middle;else high=middle;
    }
    return result(low,history[low]?.type==='match');
  }
  return result(safe,false);
}
