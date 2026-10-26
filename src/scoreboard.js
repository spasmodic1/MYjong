export const cleanPlayerName=value=>String(value||'').trim().replace(/\s+/g,' ').slice(0,40);
export const scoreCategory=g=>`${g.mode==='race'?`Race ${g.race.interval}s`:g.mode==='challenge'?'Challenge':'Relaxed'} · ${g.difficulty} · ${g.layout} · ${g.tiles.length/2} starting pairs`;
export function rankScores(records,category){
  return records.filter(r=>r.category===category).sort((a,b)=>a.mode==='race'
    ? a.elapsed-b.elapsed||b.score-a.score||a.created-b.created
    : b.score-a.score||a.elapsed-b.elapsed||a.created-b.created);
}
export const validScore=r=>r&&typeof r.id==='string'&&r.id.length<=80&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=40
  &&typeof r.category==='string'&&r.category.length<=180&&['relaxed','challenge','race'].includes(r.mode)
  &&Number.isInteger(r.score)&&r.score>=0&&Number.isFinite(r.elapsed)&&r.elapsed>=0&&Number.isFinite(r.created)&&r.created>=0;
