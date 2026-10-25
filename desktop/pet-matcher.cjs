const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const modelVersion='dinov2-small-q8-1';
const similarity=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
function rankSubjects(vector,references){
  const groups=new Map();
  for(const reference of references){const score=similarity(vector,reference.vector);const rows=groups.get(reference.subjectId)||[];rows.push({...reference,score});groups.set(reference.subjectId,rows);}
  return [...groups.values()].map(rows=>{rows.sort((a,b)=>b.score-a.score);return {...rows[0],score:rows.length>1?rows[0].score*.8+rows[1].score*.2:rows[0].score};}).sort((a,b)=>b.score-a.score);
}
function chooseSuggestion(ranked){
  const first=ranked[0];if(!first)return null;
  const margin=first.score-(ranked[1]?.score||0);
  return first.score>=.65 && margin>=.025?{subjectId:first.subjectId,name:first.name,referenceId:first.id,similarity:first.score,margin}:null;
}
class PetMatcher{
  constructor(library,assetRoot){this.library=library;this.assets=assetRoot;this.cache=null;this.queue=Promise.resolve();}
  async init(){
    if(this.session)return;
    try{this.cache=JSON.parse(await fs.readFile(path.join(this.library.root,'appearance.json'),'utf8'));}catch{this.cache={};}
    try{Object.assign(this.cache,JSON.parse(await fs.readFile(path.join(this.assets,'pet-reference-embeddings.json'),'utf8')));}catch{}
    const ort=require('onnxruntime-node');this.ort=ort;
    const bytes=await fs.readFile(path.join(this.assets,'models/dinov2/model_quantized.onnx'));
    this.session=await ort.InferenceSession.create(bytes,{executionProviders:['cpu'],intraOpNumThreads:2,interOpNumThreads:1,graphOptimizationLevel:'all'});
  }
  async embedding(photo,box){
    await this.init();
    const key=crypto.createHash('sha256').update(modelVersion+photo.hash+JSON.stringify(box||null)).digest('hex');
    if(this.cache[key]?.length===384)return this.cache[key];
    let image=sharp(this.library.file(photo.id,'original'));const meta=await image.metadata();
    if(box){
      const [x,y,w,h]=box;if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Invalid subject box');
      const left=Math.max(0,Math.floor(x-w*.05)),top=Math.max(0,Math.floor(y-h*.05));
      image=image.extract({left,top,width:Math.max(1,Math.min(meta.width-left,Math.ceil(w*1.1))),height:Math.max(1,Math.min(meta.height-top,Math.ceil(h*1.1)))});
    }
    const pixels=await image.resize(224,224,{fit:'contain',background:{r:124,g:116,b:104}}).removeAlpha().raw().toBuffer();
    const tensor=new Float32Array(3*224*224),mean=[.485,.456,.406],std=[.229,.224,.225];
    for(let c=0;c<3;c++)for(let i=0;i<224*224;i++)tensor[c*224*224+i]=(pixels[i*3+c]/255-mean[c])/std[c];
    const output=await this.session.run({pixel_values:new this.ort.Tensor('float32',tensor,[1,3,224,224])});
    const values=output.pooler_output?.data || output.last_hidden_state?.data;
    if(!values || values.length<384)throw Error('Unexpected image model output');
    const vector=Array.from(values.slice(0,384)),norm=Math.hypot(...vector);if(!norm)throw Error('Empty image descriptor');
    this.cache[key]=vector.map(v=>v/norm);return this.cache[key];
  }
  identify(id,detection){
    const task=this.queue.then(async()=>{
      const data=this.library.snapshot(),photo=data.photos.find(p=>p.id===id);if(!photo)throw Error('Photo no longer exists');
      const vector=await this.embedding(photo,detection?.box),references=[];
      for(const p of data.photos){
        if(p.id===id || p.hash===photo.hash)continue;
        const subject=data.subjects.find(s=>s.id===p.subjectId&&s.kind==='pet');if(!subject)continue;
        const animals=p.identity?[p.identity]:(p.analysis||[]).filter(d=>d.kind!=='person');if(animals.length>1)continue;
        if(animals[0] && detection?.kind && animals[0].kind!==detection.kind)continue;
        references.push({id:p.id,subjectId:subject.id,name:subject.name,vector:await this.embedding(p,animals[0]?.box)});
      }
      await this.library.exclusive(()=>this.library.atomic('appearance.json',this.cache));
      const ranked=rankSubjects(vector,references);
      return {suggestion:chooseSuggestion(ranked),alternatives:ranked.slice(0,3).map(r=>({subjectId:r.subjectId,name:r.name,referenceId:r.id,similarity:r.score}))};
    });this.queue=task.catch(()=>{});return task;
  }
}
module.exports={PetMatcher,rankSubjects,chooseSuggestion,modelVersion};
