import {photoUrl} from './game.js';
import {suggestedCrop,distance,distinctSubjects,FACE_MODEL,personMatch} from './photo-analysis.js';

// Shared by file, folder, phone and resumed imports. Names always need confirmation.
export function setupImportReview({api,getLibrary,setLibrary,refresh,openCrop,loadRecognition=()=>import('../assets/recognition.js')}){
  const $=id=>document.getElementById(id),queue=[],queued=new Set(),pending=[],used=new Set();
  let working=false,current=null,saving=false;
  const dialog=document.createElement('dialog');dialog.id='import-review-dialog';dialog.className='import-review';
  dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">YOUR NEW PHOTOS</span><h2 id="import-review-title">A familiar face?</h2></div><button id="import-review-later" class="close" aria-label="Review later">×</button></div><p id="import-review-explanation" class="muted"></p><div class="import-comparison"><figure><img id="import-review-new" alt="New photo, framed for a tile"><figcaption>New photo</figcaption></figure><figure id="import-review-known-wrap"><img id="import-review-known" alt="Previously confirmed photo"><figcaption id="import-review-known-label"></figcaption></figure></div><p id="import-review-framing" class="notice"></p><div id="import-name-editor" hidden><label>Choose a name<select id="import-review-name"></select></label><label>Or add a new name<input id="import-review-new-name" maxlength="80" autocomplete="off"></label></div><label class="check"><input id="import-review-use-crop" type="checkbox" checked> Use this subject’s suggested framing</label><div class="dialog-actions"><button id="import-review-skip">Later</button><button id="import-review-adjust">Adjust crop</button><button id="import-review-no">No, choose a name</button><button id="import-review-yes" class="primary">Confirm name</button></div><p id="import-review-count" class="muted"></p>';
  document.body.append(dialog);
  const discardActions=document.createElement('div');discardActions.className='dialog-actions';
  const remove=document.createElement('button');
  remove.id='import-review-delete';remove.textContent='Don’t use this match';
  remove.title='Skip this person or pet. Keep the original photo and all other matches.';
  discardActions.append(remove);$('import-review-count').before(discardActions);
  const reviewButton=document.createElement('button');reviewButton.id='review-imports';reviewButton.hidden=true;reviewButton.textContent='Review new photos';$('add-subject').after(reviewButton);
  const write=async action=>{setLibrary(await api.changePhoto(action));};
  function busy(value){saving=value;for(const button of dialog.querySelectorAll('button'))button.disabled=value;}
  function updateButton(){reviewButton.hidden=!pending.length;reviewButton.textContent=`Review new photos (${pending.length})`;}
  function canOpen(){return $('library-dialog').open && ![...document.querySelectorAll('dialog[open]')].some(d=>d.id!=='library-dialog'&&d!==dialog);}
  function showNext(){
    updateButton();if(!pending.length){current=null;if(dialog.open)dialog.close();return;}
    if(!dialog.open&&!canOpen())return;
    current=pending[0];const lib=getLibrary(),s=current.suggestion;
    $('import-review-title').textContent=s?`Is this ${s.name}?`:current.kind==='person'?'Who is this?':'Which pet is this?';
    $('import-review-explanation').textContent=s?'This looks similar to your confirmed photos. Please check before adding the name.':'A subject was found, but there isn’t a clear name match. You can choose a name or come back later.';
    $('import-review-new').src=current.preview;
    const reference=s&&lib.photos.find(p=>p.id===s.referenceId);$('import-review-known-wrap').hidden=!reference;
    if(reference){$('import-review-known').src=photoUrl(reference);$('import-review-known-label').textContent=`Confirmed ${s.name}`;}
    $('import-review-framing').textContent=current.autoFramed?'Automatically framed around the detected subject. You can adjust it.':current.multiple?'Several subjects were found. Choose and review each frame.':current.crop?'A suggested frame is ready. Confirm it or adjust the crop.':current.uncertain?'Kept the full photo because the detection needs review.':'Kept the full photo to avoid cutting off the subject.';
    $('import-name-editor').hidden=Boolean(s);$('import-review-no').hidden=!s;
    const select=$('import-review-name');select.replaceChildren(new Option('Choose a name…',''),...lib.subjects.map(subject=>new Option(subject.name,subject.id)));select.value=s?.subjectId||'';
    $('import-review-new-name').value='';$('import-review-yes').textContent=s?`Yes, ${s.name}`:'Save name';
    $('import-review-use-crop').checked=Boolean(current.crop);$('import-review-use-crop').closest('label').hidden=!current.crop;
    const savedPhoto=lib.photos.find(p=>p.id===current.sourceId);if(savedPhoto?.framing==='manual'&&!used.has(current.sourceId)){$('import-review-new').src=photoUrl(savedPhoto);$('import-review-framing').textContent='Your manual framing has been kept.';$('import-review-use-crop').checked=false;$('import-review-use-crop').closest('label').hidden=true;}
    $('import-review-count').textContent=`${pending.length} ${pending.length===1?'subject':'subjects'} left to review. Names are never applied without your confirmation.`;
    if(!dialog.open)dialog.showModal();
  }
  async function next(){
    pending.shift();current=null;refresh();
    // A name confirmed moments ago can identify the next photo in the same batch.
    const item=pending[0];
    if(item?.kind==='person'){
      try{item.suggestion=await personSuggestion(item.detection,await loadRecognition());}
      catch{/* Keep manual naming available if a reference cannot be read. */}
    }
    showNext();
  }
  reviewButton.onclick=showNext;$('import-review-later').onclick=()=>dialog.close();$('import-review-skip').onclick=next;
  async function discardMatch(){
    if(!current||saving)return;
    busy(true);
    try{
      await write({type:'review-match',id:current.originalId,detection:current.detection});
      await next();
    }catch(e){$('import-review-explanation').textContent=e.message;}
    finally{busy(false);}
  }
  remove.onclick=discardMatch;
  $('import-review-no').onclick=()=>{$('import-name-editor').hidden=false;$('import-review-name').value='';$('import-review-new-name').value='';$('import-review-no').hidden=true;$('import-review-title').textContent=current.kind==='person'?'Who is this?':'Which pet is this?';$('import-review-yes').textContent='Save name';};
  $('import-review-adjust').onclick=async()=>{try{if(used.has(current.sourceId)){await write({type:'copy',id:current.sourceId});current.sourceId=getLibrary().photos.at(-1).id;}const p=getLibrary().photos.find(p=>p.id===current.sourceId);if(p)openCrop(p);}catch(e){$('import-review-explanation').textContent=e.message;}};
  $('crop-dialog').addEventListener('close',()=>{if(current){const p=getLibrary().photos.find(p=>p.id===current.sourceId);if(p?.framing==='manual'){$('import-review-new').src=photoUrl(p);$('import-review-framing').textContent='Your manual framing will be kept.';}}});
  $('import-review-name').onchange=()=>{$('import-review-yes').textContent='Save name';};
  $('import-review-new-name').oninput=()=>{$('import-review-yes').textContent='Save name';};
  $('import-name-editor').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();$('import-review-yes').click();}};
  $('import-review-yes').onclick=async()=>{
    if(saving)return;busy(true);
    try{
      let lib=getLibrary(),subject=lib.subjects.find(s=>s.id===$('import-review-name').value),name=$('import-review-new-name').value.trim();
      if(name){subject=lib.subjects.find(s=>s.name.toLowerCase()===name.toLowerCase());if(!subject){await write({type:'subject',name,kind:current.kind==='person'?'person':'pet',included:true});subject=getLibrary().subjects.at(-1);}}
      if(!subject){$('import-name-editor').hidden=false;$('import-review-name').focus();return;}
      let photo=getLibrary().photos.find(p=>p.id===current.sourceId);
      if(!photo){next();return;}
      let copied=false;
      if(used.has(photo.id)){await write({type:'copy',id:photo.id});photo=getLibrary().photos.at(-1);copied=true;}
      await write({type:'photo',id:photo.id,subjectId:subject.id,included:true,identity:current.detection});
      if(copied||photo.framing!=='manual'){
        if($('import-review-use-crop').checked&&current.crop&&JSON.stringify(photo.crop)!==JSON.stringify(current.crop))await write({type:'crop',id:photo.id,crop:current.crop,automatic:true});
        else if(!$('import-review-use-crop').checked&&(current.autoFramed||copied))await write({type:'crop',id:photo.id,crop:null});
      }
      await write({type:'review-match',id:current.originalId,detection:current.detection});
      used.add(current.sourceId);await next();
    }catch(e){$('import-review-explanation').textContent=e.message;}finally{busy(false);}
  };
  function preview(image,crop){
    const canvas=document.createElement('canvas');canvas.width=224;canvas.height=280;const ctx=canvas.getContext('2d'),w=image.naturalWidth,h=image.naturalHeight;
    if(crop){const width=Math.min(w,h*.8)/crop.zoom,height=width/.8;ctx.drawImage(image,(w-width)*crop.x,(h-height)*crop.y,width,height,0,0,224,280);}
    else{const scale=Math.min(224/w,280/h);ctx.drawImage(image,(224-w*scale)/2,(280-h*scale)/2,w*scale,h*scale);}
    return canvas.toDataURL('image/jpeg',.85);
  }
  async function personSuggestion(detection,engine){
    const references=[];
    for(const photo of getLibrary().photos){
      const subject=getLibrary().subjects.find(s=>s.id===photo.subjectId&&s.kind==='person');if(!subject)continue;
      let faces=(photo.analysis||[]).filter(d=>d.kind==='person');
      if(!faces.length||faces.some(f=>f.model!==FACE_MODEL)){
        const img=new Image();img.crossOrigin='anonymous';img.src=photo.originalSrc||photoUrl(photo,true);await img.decode();
        const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        faces=(await engine.detectFaces(canvas)).map(f=>({...f,box:f.box.map(v=>v/scale)}));
        await write({type:'analysis',id:photo.id,detections:[...(photo.analysis||[]).filter(d=>d.kind!=='person'),...faces]});
      }
      const face=photo.identity?.kind==='person'&&photo.identity.model===FACE_MODEL?photo.identity:faces.length===1?faces[0]:null;
      if(face?.descriptor)references.push({subject,photo,distance:distance(face.descriptor,detection.descriptor)});
    }
    return personMatch(references);
  }
  async function analyze(id,engine){
    let photo=getLibrary().photos.find(p=>p.id===id);if(!photo||photo.subjectId&&!photo.reviewPending||photo.included===false)return;
    if(photo.subjectId)used.add(id);
    const image=new Image();image.crossOrigin='anonymous';image.src=photo.originalSrc||photoUrl(photo,true);await image.decode();
    const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    $('library-message').textContent='Looking for pets in your new photo…';const animals=await engine.detectPets(canvas);
    $('library-message').textContent='Looking for faces in your new photo…';const faces=await engine.detectFaces(canvas);
    const detections=distinctSubjects(animals,faces).map(d=>({...d,box:d.box.map(v=>v/scale)}));
    await write({type:'analysis',id,detections,review:true});
    photo=getLibrary().photos.find(p=>p.id===id);if(!photo)return;
    let autoCrop=null;
    if(detections.length===1&&detections[0].score>=.8&&!photo.framing&&!photo.crop&&photo.revision===0){
      autoCrop=suggestedCrop(detections[0].box,image.naturalWidth,image.naturalHeight,detections[0].kind);
      if(autoCrop)await write({type:'crop',id,crop:autoCrop,automatic:true});
    }
    for(const detection of detections){
      if((photo.reviewedDetections||[]).some(d=>d.kind===detection.kind&&d.box.every((v,i)=>Math.abs(v-detection.box[i])<1)))continue;
      $('library-message').textContent='Comparing with your confirmed photos…';
      const suggestion=detection.kind==='person'?await personSuggestion(detection,engine):(await api.identifyPet?.(id,detection))?.suggestion;
      const crop=suggestedCrop(detection.box,image.naturalWidth,image.naturalHeight,detection.kind);
      pending.push({sourceId:id,originalId:id,kind:detection.kind,detection,suggestion,crop,preview:preview(image,crop),autoFramed:Boolean(autoCrop),multiple:detections.length>1,uncertain:detections.length>1||detection.score<.8});
    }
  }
  async function work(){
    if(working)return;working=true;
    try{
      $('library-message').textContent='Looking for familiar faces and a comfortable tile frame…';
      const engine=await loadRecognition();
      let checked=0,failed=0;while(queue.length){const id=queue.shift();$('library-message').textContent=`Checking your new photos… ${checked} checked, ${queue.length+1} waiting.`;try{await analyze(id,engine);}catch(e){failed++;$('library-message').textContent=`Photo recognition could not finish: ${e.message}. You can still name and frame it manually.`;}finally{checked++;queued.delete(id);refresh();updateButton();}}
      $('library-message').textContent=pending.length?`Photos checked. ${pending.length} subject suggestions are ready for review.`:'Photos checked. No clear identity match was found; choose a name and frame manually if needed.';
      if(failed)$('library-message').textContent+=` ${failed} photos could not be analyzed. Their originals are safe; you can name and frame them manually.`;
      showNext();
    }catch(e){$('library-message').textContent=`Photo recognition is unavailable: ${e.message}. Your photos are safe to name and frame manually.`;}finally{working=false;}
  }
  return {enqueue(ids=[]){for(const id of ids)if(!queued.has(id)&&!pending.some(p=>p.sourceId===id)){queued.add(id);queue.push(id);}if(queue.length)void work();},openPending:showNext,reviewPhoto(id){this.enqueue([id]);},get pending(){return pending.length;}};
}
