import { isFree, pairs } from './rules.js';
import { makeGame, defaults, emptyStats, photoUrl, reshuffle, score, validState } from './game.js';
import { createHintCycle } from './hints.js';
import { standardArt, standardName } from './standard-tiles.js';
import { createAudio } from './audio.js';
import { browserAPI } from './browser-api.js';
import { readSave } from './storage.js';
import { suggestedCrop, groupDetections } from './photo-analysis.js';

const $ = id => document.getElementById(id);
let api, library = { photos: [], subjects: [] }, state, selected = null, highlighted = [], paused = false;
let activeSubject = null, activeCrop = null, saveTimer, lastTick = performance.now(), saveChain = Promise.resolve();
const nextHint = createHintCycle();
const audio = createAudio(() => state.settings);
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const game = () => state.game;
const setMessage = message => { $('status').textContent = message; };
function show(id) { if (!$(id).open) $(id).showModal(); }
function close(id) { $(id).close(); }
async function message(title, text, confirm = false, ok = 'Continue') {
  $('message-title').textContent = title; $('message-text').textContent = text;
  $('message-cancel').hidden = !confirm; $('message-ok').textContent = ok;
  show('message-dialog');
  return new Promise(resolve => {
    let answer = false;
    $('message-ok').onclick = () => { answer = true; close('message-dialog'); };
    $('message-cancel').onclick = () => close('message-dialog');
    $('message-dialog').addEventListener('close', () => resolve(answer), { once: true });
  });
}
function save(immediate = false) {
  clearTimeout(saveTimer);
  const commit = () => {
    const snapshot = structuredClone(state);
    saveChain = saveChain.catch(() => {}).then(() => api.save(snapshot)).then(() => {
      $('save-note').textContent = 'Saved on this computer · Ready whenever you are';
    }).catch(() => { $('save-note').textContent = 'Could not save. Keep MYjong open and check available disk space.'; });
  };
  if (immediate) commit(); else saveTimer = setTimeout(commit, 150);
}
function appearance() {
  const s = state.settings;
  document.body.className = [s.theme, s.tileStyle === 'porcelain' ? 'porcelain' : '', s.available ? '' : 'no-dim', s.captions ? '' : 'no-captions'].join(' ');
}
function sizeBoard() {
  if (!state) return;
  const tiles = game().tiles;
  const maxX = Math.max(...tiles.map(t => t.x + 1 + t.z * .11));
  const rows = Math.max(...tiles.map(t => t.y)) + 1;
  const space = $('board-space');
  const width = Math.max(120, space.clientWidth - 30), height = Math.max(120, space.clientHeight - 45);
  const unit = Math.min(width / (maxX * 1.08), height / (rows * 1.55 + .3), 125) * (state.settings.zoom || 1);
  space.classList.toggle('zoomed',(state.settings.zoom || 1)>1);
  const board = $('board'); board.style.width = `${maxX * unit * 1.08}px`; board.style.height = `${rows * unit * 1.55}px`;
  board.style.setProperty('--tile-width', `${unit}px`);
  for (const button of board.children) {
    const t = tiles.find(t => t.id === Number(button.dataset.id));
    button.style.left = `${(t.x * 1.08 + t.z * .11) * unit}px`;
    button.style.top = `${(t.y * 1.55 + .13 - t.z * .08) * unit}px`;
  }
}
function tileName(tile) {
  return tile.face >= 10 ? standardName(tile.face - 10) : game().photos[tile.face]?.name || 'Photo';
}
function updateCounters() {
  const g = game(), remaining = g.tiles.filter(t => !t.removed).length, moves = pairs(g.tiles).length;
  $('remaining').textContent = remaining; $('layout-name').textContent = g.layout;
  $('difficulty-label').textContent = g.difficulty;
  $('mode-label').textContent = g.mode === 'challenge' ? 'Timed play' : 'No timer';
  $('clock').hidden = $('score').hidden = g.mode !== 'challenge';
  $('clock').textContent = time(g.elapsed); $('score').textContent = `${score(g)} points`;
  $('pair-count').textContent = `${moves} available ${moves === 1 ? 'pair' : 'pairs'}`;
  $('progress-fill').style.width = `${(1 - remaining / g.tiles.length) * 100}%`;
  const hasPhotos = g.tiles.some(t => t.face < 10);
  $('collection-note').textContent = hasPhotos ? (g.tiles.some(t => t.face >= 10) ? 'Your memories & a little tradition' : 'A collection of familiar faces') : 'The traditional collection';
  $('matching-note').textContent = hasPhotos ? (g.matching === 'subject' ? 'Match the same person or pet, even in different photos.' : 'Match identical photos and traditional symbols.') : 'Match identical traditional symbols.';
  $('undo').disabled = !g.history.length || g.recorded;
  $('hint').disabled = $('shuffle').disabled = remaining === 0;
  return { remaining, moves };
}
function render(message = '') {
  const focused = document.activeElement?.dataset?.id;
  const board = $('board'); board.replaceChildren();
  for (const tile of game().tiles.filter(t => !t.removed).sort((a,b) => a.z - b.z || a.y - b.y)) {
    const free = isFree(tile, game().tiles), button = document.createElement('button');
    button.className = `tile${free ? '' : ' blocked'}${selected === tile.id ? ' selected' : ''}${highlighted.includes(tile.id) ? ' hint' : ''}`;
    button.dataset.id = tile.id; button.dataset.suit = tile.face % 3;
    button.style.zIndex = tile.z * 10 + 1;
    button.setAttribute('aria-label', `${tileName(tile)}, ${free ? 'available' : 'blocked'}, row ${tile.y + 1}, column ${tile.x + 1}, layer ${tile.z + 1}`);
    button.setAttribute('aria-pressed', String(selected === tile.id));
    button.title = `${tileName(tile)} · ${free ? 'Available' : 'Blocked'}`;
    if (tile.face >= 10) button.append(standardArt(tile.face - 10));
    else {
      const photo = game().photos[tile.face], variant = photo.variants[tile.variant || 0] || photo.variants[0];
      const img = document.createElement('img'); img.className = 'tile-photo'; img.src = variant.src; img.alt = ''; img.draggable = false;
      img.onerror = () => { const fallback = document.createElement('span'); fallback.className = 'tile-emblem'; fallback.textContent = photo.name.slice(0,1); img.replaceWith(fallback); };
      button.append(img);
    }
    const caption = document.createElement('span'); caption.className = 'tile-caption'; caption.textContent = tileName(tile); button.append(caption);
    button.onclick = () => choose(tile); board.append(button);
  }
  sizeBoard();
  const { remaining, moves } = updateCounters();
  setMessage(message || (remaining === 0 ? 'A lovely little victory. Your board is clear.' : moves === 0 ? 'No open matches right now. Try Undo or Shuffle.' : 'Choose two free tiles with matching faces.'));
  if (focused) (board.querySelector(`[data-id="${focused}"]`) || board.querySelector('.tile:not(.blocked)'))?.focus({ preventScroll: true });
  save();
}
function choose(tile) {
  if (paused) return;
  if (!isFree(tile, game().tiles)) { audio.play('blocked'); setMessage('This tile needs space: uncover it and open its left or right side.'); return; }
  highlighted = [];
  if (selected === tile.id) { selected = null; render(); return; }
  const previous = game().tiles.find(t => t.id === selected);
  if (previous && previous.face === tile.face) {
    matchEffect([previous.id,tile.id]);
    previous.removed = tile.removed = true;
    game().history.push({ type: 'match', ids: [previous.id, tile.id] });
    selected = null; state.stats.matches++; audio.play('match'); render('A little more room. Nicely matched.');
    if (game().tiles.every(t => t.removed)) win();
  } else { selected = tile.id; audio.play('select'); render(previous ? 'Those faces are different. Find a partner for this tile.' : 'Now find its matching face.'); }
}
function matchEffect(ids) {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const id of ids) {
    const original=$('board').querySelector(`[data-id="${id}"]`);if(!original)continue;
    const r=original.getBoundingClientRect(),style=getComputedStyle(original),ghost=document.createElement('div');
    ghost.className='match-ghost';ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',background:style.background,borderRadius:style.borderRadius,boxShadow:style.boxShadow});
    ghost.style.setProperty('--tile-width',r.width+'px');
    for(const child of original.children)ghost.append(child.cloneNode(true));
    document.body.append(ghost);
    ghost.animate([{opacity:1,transform:'scale(1)',filter:'brightness(1.12)'},{opacity:0,transform:'translateY(-18px) scale(.9)',filter:'brightness(1.35)'}],{duration:240,easing:'ease-out'}).finished.then(()=>ghost.remove(),()=>ghost.remove());
  }
}
function hint() {
  if (game().tiles.every(t => t.removed)) return;
  selected = null; highlighted = nextHint(game().tiles).map(t => t.id);
  if (highlighted.length) game().hints++;
  render(highlighted.length ? 'A pair for you. Press Hint again to see another.' : 'No open pairs. Try Undo or Shuffle.');
}
function undo() {
  if (game().recorded) return;
  const last = game().history.pop(); if (!last) return;
  if (last.type === 'match') last.ids.forEach(id => { game().tiles.find(t => t.id === id).removed = false; });
  else if (last.type === 'shuffle') game().tiles = last.tiles;
  selected = null; highlighted = []; render('One step back. Take another look.');
}
function win() {
  const g = game(); if (g.recorded) return;
  g.recorded = true; state.stats.won++;
  const unlock = name => { if (!state.stats.achievements.includes(name)) state.stats.achievements.push(name); };
  unlock('First little victory'); if (!g.hints) unlock('A keen eye'); if (g.level === 3) unlock('A mountain made small');
  if (state.stats.won >= 10) unlock('Ten moments of calm');
  if (g.photos.length) unlock('Familiar faces');
  const key = `${g.difficulty} · ${g.layout}`;
  if (g.mode === 'challenge') {
    const best = state.stats.best[key];
    if (!best || score(g) > best.score || score(g) === best.score && g.elapsed < best.elapsed) state.stats.best[key] = { score: score(g), elapsed: g.elapsed };
  }
  $('win-details').textContent = g.mode === 'challenge' ? `${time(g.elapsed)} · ${score(g)} points · ${g.hints} hints` : `${g.tiles.length / 2} pairs found. A moment well spent.`;
  updateCounters(); save(true); audio.play('win'); show('win-dialog');
}
function openNew() {
  for (const key of ['layout','difficulty','collection','matching','mode']) $(key).value = state.settings[key];
  $('new-warning').hidden = !game().history.length || game().recorded;
  show('new-dialog');
}
async function startNew(event) {
  event.preventDefault();
  const next = { ...state.settings };
  for (const key of ['layout','collection','matching','mode']) next[key] = $(key).value;
  next.difficulty = Number($('difficulty').value);
  const g = makeGame(next, library);
  if (next.collection !== 'traditional' && !g.photos.length) {
    if (!await message('A traditional puzzle for now?', 'No named photos are included yet. You can add and name photos in your collection, or play with traditional tiles now.', true, 'Play traditional')) return;
  }
  state.settings = next; state.game = g; state.stats.played++;
  selected = null; highlighted = []; close('new-dialog'); lastTick = performance.now(); render('A fresh puzzle, just for you.'); save(true);
}
function openSettings() {
  for (const key of ['theme','tileStyle','volume']) $(key).value = state.settings[key];
  for (const key of ['available','captions','sound','music']) $(key).checked = state.settings[key];
  $('settings-message').textContent = ''; show('settings-dialog');
}
function openStats() {
  const content = $('stats-content'); content.replaceChildren();
  const grid = document.createElement('div'); grid.className = 'stat-grid';
  for (const [value, label] of [[state.stats.played,'puzzles started'],[state.stats.won,'boards cleared'],[state.stats.matches,'pairs found']]) {
    const cell = document.createElement('div'), number = document.createElement('strong'), caption = document.createElement('span'); number.textContent = value; caption.textContent = label; cell.append(number, caption); grid.append(cell);
  }
  content.append(grid);
  const h = document.createElement('h3'); h.textContent = 'Small celebrations'; content.append(h);
  for (const name of state.stats.achievements.length ? state.stats.achievements : ['Your first celebration is waiting. Clear a board to begin.']) {
    const row = document.createElement('p'); row.className = 'achievement'; row.textContent = `✧ ${name}`; content.append(row);
  }
  const best = document.createElement('h3'); best.textContent = 'Challenge personal bests'; content.append(best);
  for (const [key, value] of Object.entries(state.stats.best)) { const row = document.createElement('p'); row.textContent = `${key}: ${value.score} points · ${time(value.elapsed)}`; content.append(row); }
  if (!Object.keys(state.stats.best).length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Try a Challenge puzzle to record a personal best.'; content.append(p); }
  show('stats-dialog');
}

async function change(action) { library = await api.changePhoto(action); renderLibrary(); save(); }
function option(text, value) { const node = document.createElement('option'); node.textContent = text; node.value = value; return node; }
function renderLibrary() {
  const filter = $('subject-filter'), old = filter.value;
  filter.replaceChildren(option('All photos','all'), option('Needs a name','unassigned'), ...library.subjects.map(s => option(s.name,s.id)));
  filter.value = [...filter.options].some(o => o.value === old) ? old : 'all';
  $('library-count').textContent = `${library.photos.length} photos · ${library.subjects.length} names`;
  const subjects = $('subject-list'); subjects.replaceChildren();
  for (const s of library.subjects) {
    const button = document.createElement('button'); button.className = `subject-chip${s.included ? '' : ' excluded'}`;
    button.textContent = `${s.name} · ${library.photos.filter(p => p.subjectId === s.id).length}`; button.onclick = () => editSubject(s); subjects.append(button);
  }
  const grid = $('photo-grid'); grid.replaceChildren();
  const visible = library.photos.filter(p => filter.value === 'all' || filter.value === 'unassigned' && !p.subjectId || p.subjectId === filter.value);
  if (!visible.length) {
    const empty = document.createElement('p'); empty.className = 'empty-collection'; empty.textContent = library.photos.length ? 'No photos in this group yet.' : 'A few favorite faces will make this feel like home. Add your first photos above.'; grid.append(empty);
  }
  for (const photo of visible) {
    const card = document.createElement('article'); card.className = 'photo-card';
    const img = document.createElement('img'); img.src = photoUrl(photo); img.alt = library.subjects.find(s => s.id === photo.subjectId)?.name || 'Photo needing a name'; img.loading = 'lazy';
    const select = document.createElement('select'); select.setAttribute('aria-label', `Name for ${photo.name}`);
    select.append(option('Choose a name…',''), ...library.subjects.map(s => option(s.name, s.id))); select.value = photo.subjectId || '';
    select.onchange = () => run(() => change({ type: 'photo', id: photo.id, subjectId: select.value, included: photo.included }));
    const label = document.createElement('label'); label.className = 'check'; const included = document.createElement('input'); included.type = 'checkbox'; included.checked = photo.included;
    included.onchange = () => run(() => change({ type: 'photo', id: photo.id, subjectId: photo.subjectId, included: included.checked })); label.append(included, document.createTextNode('Use in new puzzles'));
    const buttons = document.createElement('div'); buttons.className = 'button-wrap';
    const crop = document.createElement('button'); crop.textContent = 'Frame photo'; crop.onclick = () => openCrop(photo);
    const copy = document.createElement('button'); copy.textContent = 'Another person / pet'; copy.onclick = () => run(async () => {
      await change({ type:'copy', id:photo.id }); $('subject-filter').value = 'unassigned'; renderLibrary();
      $('library-message').textContent = 'A separate copy is ready. Give it another name and frame that person or pet.';
    });
    const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.onclick = () => run(async () => {
      if (await message('Remove this copy?', 'This removes the photo from your MYjong collection. Your original photo stays untouched. A current puzzle may keep its own reference until you start a new game.', true, 'Remove copy')) await change({ type: 'delete', id: photo.id });
    });
    buttons.append(crop, copy, remove); card.append(img, select, label, buttons); grid.append(card);
  }
}
function editSubject(subject = null) {
  activeSubject = subject?.id || null;
  $('subject-title').textContent = subject ? 'A familiar name' : 'Add someone you love';
  $('subject-name').value = subject?.name || ''; $('subject-kind').value = subject?.kind || 'pet'; $('subject-included').checked = subject?.included !== false;
  $('merge-target').replaceChildren(...library.subjects.filter(s => s.id !== subject?.id).map(s => option(s.name,s.id)));
  $('merge-label').hidden = $('merge-subject').hidden = !subject || library.subjects.length < 2;
  show('subject-dialog');
}
async function importPhotos(folder = false, files = null) {
  $('library-message').textContent = 'Copying photos into your collection…';
  const result = await api.importPhotos(files || folder);
  if (!result) { $('library-message').textContent = ''; return; }
  library = result.library; renderLibrary();
  $('library-message').textContent = `${result.added} photos added${result.duplicates ? ` · ${result.duplicates} already in your collection` : ''}. Choose a name below to include them in puzzles.${result.errors.length ? ` ${result.errors.length} could not be imported.` : ''}`;
  if (result.errors.length) await message('Some photos need another try', result.errors.slice(0, 8).join('\n'));
}
function openCrop(photo) {
  activeCrop = photo;
  $('crop-zoom').value = photo.crop?.zoom || 1; $('crop-x').value = photo.crop?.x ?? .5; $('crop-y').value = photo.crop?.y ?? .5;
  const img = $('crop-image'); img.onload = drawCrop;
  img.src = photo.originalSrc || photoUrl(photo, true); show('crop-dialog');
}
function cropValues() { return { x: Number($('crop-x').value), y: Number($('crop-y').value), zoom: Number($('crop-zoom').value) }; }
function drawCrop() {
  const img = $('crop-image'), w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return;
  const crop = cropValues(), width = Math.min(w, h * .8) / crop.zoom;
  const scale = $('crop-preview').clientWidth / width;
  img.style.width = `${w * scale}px`; img.style.height = `${h * scale}px`;
  img.style.left = `${-(w * scale - $('crop-preview').clientWidth) * crop.x}px`;
  img.style.top = `${-(h * scale - $('crop-preview').clientHeight) * crop.y}px`;
}
async function applyCrop(crop) {
  await change({ type: 'crop', id: activeCrop.id, crop }); close('crop-dialog');
  // Refresh existing game references without changing their identity.
  const updated = library.photos.find(p => p.id === activeCrop.id);
  game().photos.forEach(p => p.variants.forEach(v => { if (v.id === updated.id) v.src = photoUrl(updated); }));
  render('Photo frame updated.');
}
async function run(fn) { try { await fn(); } catch (e) { await message('Let’s try that again', e.message || String(e)); } }
function recognitionUI() {
  const dialog = document.createElement('dialog'); dialog.id='recognition-dialog'; dialog.className='wide-dialog';
  dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">A LITTLE HELP FINDING FACES</span><h2>Discover & frame</h2></div><button class="close" id="recognition-close" aria-label="Close">×</button></div><p class="muted">Everything runs on this computer. People can be grouped by similar faces; pet detection finds animals and suggests framing, but you confirm each pet’s identity. Review every suggestion before applying it.</p><div class="button-wrap"><select id="recognition-kind" aria-label="What to look for"><option value="pets">Look for pets</option><option value="people">Look for people</option></select><button id="recognition-start" class="primary">Find suggestions</button></div><p id="recognition-status" role="status"></p><div id="recognition-results"></div>';
  document.body.append(dialog);
  const button=document.createElement('button'); button.id='discover-faces';button.textContent='Discover & frame';$('add-subject').after(button);
  button.onclick=()=>show('recognition-dialog');
  let cancel=false, used=new Set();
  $('recognition-close').onclick=()=>close('recognition-dialog');
  dialog.addEventListener('close',()=>{cancel=true;});
  $('recognition-start').onclick=()=>run(async()=>{
    if(!library.photos.length){$('recognition-status').textContent='Add a few photos first.';return;}
    cancel=false;used=new Set();$('recognition-start').disabled=true;$('recognition-kind').disabled=true;$('recognition-results').replaceChildren();
    const results=[],type=$('recognition-kind').value;
    try {
      const engine=await import('../assets/recognition.js');
      for(const [index,photo] of [...library.photos].entries()) {
        if(cancel) break;
        $('recognition-status').textContent=`Looking at photo ${index+1} of ${library.photos.length}… You can close this window to stop.`;
        const img=new Image();img.crossOrigin='anonymous';img.src=photo.originalSrc || photoUrl(photo,true); await img.decode();
        const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
        const detections=await (type==='people'?engine.detectFaces(canvas):engine.detectPets(canvas));
        const normalized=detections.map(d=>({...d,box:d.box.map(v=>v/scale)}));
        library=await api.changePhoto({type:'analysis',id:photo.id,detections:normalized});
        for(const detection of normalized) {
          const crop=suggestedCrop(detection.box,img.naturalWidth,img.naturalHeight,detection.kind);
          const thumb=document.createElement('canvas');thumb.width=144;thumb.height=180;
          const w=img.naturalWidth,h=img.naturalHeight;
          if(crop) { const width=Math.min(w,h*.8)/crop.zoom,height=width/.8;thumb.getContext('2d').drawImage(img,(w-width)*crop.x,(h-height)*crop.y,width,height,0,0,144,180); }
          else { const fit=Math.min(144/w,180/h);thumb.getContext('2d').drawImage(img,(144-w*fit)/2,(180-h*fit)/2,w*fit,h*fit); }
          results.push({...detection,photo,crop,preview:thumb.toDataURL('image/jpeg',.8)});
        }
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      const groups=groupDetections(results);
      $('recognition-status').textContent=`${cancel?'Stopped. ':''}${results.length} suggestions in ${groups.length} review groups. Nothing is named or cropped until you apply a group.${results.length?'':' No confident detections were found. You can still name and frame photos manually.'}`;
      for(const [index,group] of groups.entries()) {
        const card=document.createElement('section');card.className='recognition-group';
        const heading=document.createElement('h3');heading.textContent=group.kind==='person'?`Possible person ${index+1}`:`${group.kind[0].toUpperCase()+group.kind.slice(1)} · review identity`;
        const gallery=document.createElement('div');gallery.className='recognition-gallery';
        const selections=[];
        for(const item of group.items) {
          const label=document.createElement('label'); const check=document.createElement('input');check.type='checkbox';check.checked=true;
          const img=document.createElement('img');img.src=item.preview;img.alt='Suggested tile framing';
          const caption=document.createElement('span');caption.textContent=`${Math.round(item.score*100)}% detection confidence${item.crop?'':' · full photo'}`;
          label.append(img,check,caption);gallery.append(label);selections.push({check,item});
        }
        const label=document.createElement('label');label.textContent='Confirm a name for the selected photos';
        const name=document.createElement('input');name.maxLength=80;name.placeholder='A familiar name';
        const names=[...new Set(group.items.map(i=>library.subjects.find(s=>s.id===i.photo.subjectId)?.name).filter(Boolean))];
        if(names.length===1)name.value=names[0];label.append(name);
        const cropLabel=document.createElement('label');cropLabel.className='check'; const cropCheck=document.createElement('input');cropCheck.type='checkbox';cropCheck.checked=true;cropLabel.append(cropCheck,document.createTextNode('Use suggested framing (you can adjust it afterward)'));
        const apply=document.createElement('button');apply.className='primary';apply.textContent='Confirm selected photos';
        apply.onclick=()=>run(async()=>{
          if(!name.value.trim()){name.focus();return;}
          apply.disabled=true;
          try {
            let subject=library.subjects.find(s=>s.name.toLowerCase()===name.value.trim().toLowerCase());
            if(!subject){library=await api.changePhoto({type:'subject',name:name.value.trim(),kind:group.kind==='person'?'person':'pet',included:true});subject=library.subjects.at(-1);}
            for(const {check,item} of selections.filter(s=>s.check.checked)) {
              let photo=library.photos.find(p=>p.id===item.photo.id);
              if(used.has(photo.id) || photo.subjectId && photo.subjectId!==subject.id) {library=await api.changePhoto({type:'copy',id:photo.id});photo=library.photos.at(-1);}
              library=await api.changePhoto({type:'photo',id:photo.id,subjectId:subject.id,included:true});
              if(cropCheck.checked)library=await api.changePhoto({type:'crop',id:photo.id,crop:item.crop});
              used.add(item.photo.id);
            }
            apply.textContent='Added to your collection';renderLibrary();save();
          } catch(e){apply.disabled=false;throw e;}
        });
        card.append(heading,gallery,label,cropLabel,apply);$('recognition-results').append(card);
      }
    } finally {$('recognition-start').disabled=false;$('recognition-kind').disabled=false;}
  });
}
function bind() {
  recognitionUI();
  const zoom=document.createElement('div');zoom.className='board-zoom';zoom.setAttribute('aria-label','Board size');
  for(const [text,label,delta]of [['−','Smaller tiles',-.25],['Fit','Fit board',0],['+','Larger tiles',.25]]) {
    const button=document.createElement('button');button.textContent=text;button.setAttribute('aria-label',label);
    button.onclick=()=>{state.settings.zoom=delta?Math.max(1,Math.min(1.75,(state.settings.zoom||1)+delta)):1;sizeBoard();save();};zoom.append(button);
  }
  document.querySelector('.board-heading').append(zoom);
  document.querySelectorAll('[data-close]').forEach(button => { button.onclick = () => button.closest('dialog').close(); });
  $('new').onclick = openNew; $('new-form').onsubmit = e => run(() => startNew(e));
  $('undo').onclick = undo; $('hint').onclick = hint;
  $('shuffle').onclick = () => run(async () => {
    if (!await message('Give these tiles a fresh start?', 'Shuffle keeps your matched pairs and rearranges the remaining faces. It can be undone.', true, 'Shuffle')) return;
    const before = structuredClone(game().tiles);
    if (reshuffle(game())) { game().history.push({ type: 'shuffle', tiles: before }); game().shuffles++; selected = null; highlighted = []; render('A fresh arrangement. There’s a path through these tiles.'); }
    else await message('These stacks need an earlier move', 'Undo a few matches or start another puzzle. The remaining stack shape could not be paired into a solvable arrangement.');
  });
  $('settings').onclick = openSettings; $('help').onclick = () => show('help-dialog'); $('statistics').onclick = openStats;
  $('photos').onclick = () => { renderLibrary(); show('library-dialog'); };
  $('win-new').onclick = () => { close('win-dialog'); openNew(); };
  for (const key of ['theme','tileStyle','available','captions','sound','music','volume']) $(key).oninput = () => {
    state.settings[key] = ['available','captions','sound','music'].includes(key) ? $(key).checked : key === 'volume' ? Number($(key).value) : $(key).value;
    appearance(); audio.sync(); save();
  };
  $('backup').onclick = () => run(async () => { if (await api.backup()) $('settings-message').textContent = 'Backup saved. Keep a copy somewhere safe.'; });
  if (api.restore) {
    const restore = document.createElement('button'); restore.textContent = 'Restore backup'; restore.id = 'restore';
    $('backup').after(restore);
    restore.onclick = () => run(async () => {
      if (!await message('Restore your collection?', 'This replaces the current MYjong library and saved game with the backup. A safety copy of your current data will be saved automatically.',true,'Choose backup')) return;
      clearTimeout(saveTimer); await saveChain;
      const result = await api.restore(); if (!result) return;
      library = result.library;
      if (validState(result.state)) state=result.state;
      else { state.game=makeGame(state.settings,library); state.stats.played++; }
      appearance(); render('Your backup is restored.'); close('settings-dialog');
    });
  }
  $('update').onclick = () => run(async () => { $('update').disabled = true; $('settings-message').textContent = 'Checking for updates…'; try { $('settings-message').textContent = await api.update(); } finally { $('update').disabled = false; } });
  api.onUpdate?.(text=>{$('settings-message').textContent=text;});
  $('subject-filter').onchange = renderLibrary; $('add-subject').onclick = () => editSubject();
  $('subject-form').onsubmit = event => { event.preventDefault(); run(async () => { await change({ type: 'subject', id: activeSubject, name: $('subject-name').value, kind: $('subject-kind').value, included: $('subject-included').checked }); close('subject-dialog'); }); };
  $('merge-subject').onclick = () => run(async () => {
    if (await message('Bring these names together?', 'All photos under this name will move into the selected name. You can reassign individual photos afterward.', true, 'Merge names')) { await change({ type: 'merge', from: activeSubject, to: $('merge-target').value }); close('subject-dialog'); }
  });
  $('import-files').onclick = () => window.myjong ? run(() => importPhotos()) : $('file-picker').click();
  $('import-folder').onclick = () => window.myjong ? run(() => importPhotos(true)) : message('Folder discovery is in the Windows app', 'You can use Add photos in this browser preview.');
  $('file-picker').onchange = event => run(async () => { await importPhotos(false, [...event.target.files]); event.target.value = ''; });
  $('import-phone').onclick = () => run(async () => {
    if (!api.phone) { await message('Phone importing is in the Windows app', 'The installed app can receive photos from your phone over home Wi-Fi.'); return; }
    const result = await api.phone(); $('phone-qr').src = result.qr; $('phone-url').textContent = result.url; show('phone-dialog');
  });
  $('phone-dialog').addEventListener('close', () => api.stopPhone?.());
  api.onImport?.(async () => { library = await api.library(); renderLibrary(); $('library-message').textContent = 'Photos received from your phone. Choose a name to include them in puzzles.'; });
  for (const key of ['crop-x','crop-y','crop-zoom']) $(key).oninput = drawCrop;
  $('crop-reset').onclick = () => { $('crop-x').value = $('crop-y').value = .5; $('crop-zoom').value = 1; drawCrop(); };
  $('crop-save').onclick = () => run(() => applyCrop(cropValues())); $('crop-full').onclick = () => run(() => applyCrop(null));
  $('pause').onclick = () => { paused = true; $('board-space').classList.add('paused'); audio.pause(); show('pause-dialog'); save(true); };
  $('resume').onclick = () => close('pause-dialog');
  $('pause-dialog').addEventListener('close', () => { paused = false; lastTick = performance.now(); $('board-space').classList.remove('paused'); audio.sync(); });
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    if (event.key.toLowerCase() === 'h' && !event.ctrlKey && !event.metaKey) { event.preventDefault(); hint(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
  });
  document.addEventListener('pointerdown', () => { audio.sync(); }, { once: true });
  document.addEventListener('visibilitychange', () => { lastTick = performance.now(); if (document.hidden) { audio.pause(); save(true); } else audio.sync(); });
  window.addEventListener('pagehide', () => save(true));
  api.onClose?.(async () => { save(true); await saveChain; await api.finishClose(); });
  new ResizeObserver(sizeBoard).observe($('board-space'));
  setInterval(() => {
    const now = performance.now(), delta = Math.min(2, (now - lastTick) / 1000); lastTick = now;
    if (!document.hidden && !paused && !document.querySelector('dialog[open]') && !game().recorded) {
      game().elapsed += delta; $('clock').textContent = time(game().elapsed);
    }
  }, 1000);
  setInterval(() => save(true), 10000);
}
async function init() {
  api = window.myjong || await browserAPI();
  const loaded = await api.load(); library = loaded.library;
  state = validState(loaded.state) ? loaded.state : null;
  let restored = Boolean(state);
  if (!state) {
    state = { version: 2, settings: { ...defaults }, stats: emptyStats(), game: null };
    state.game = makeGame(state.settings, library); state.stats.played++;
    // Migrate the first prototype's local save when it contains compatible photos.
    let old; try { old = readSave(localStorage); } catch { /* Desktop storage can be disabled. */ }
    if (old && old.photos.length === 10) {
      state.game = { ...state.game, tiles: old.tiles.map(t => ({ ...t })), photos: old.photos.map(p => ({ name: p.name, variants: [{ src: p.src }] })),
        layout: old.layout, difficulty: old.difficulty, history: old.history.map(ids => ({ type: 'match', ids })) };
      state.settings.theme = old.theme; state.settings.layout = old.nextLayout; state.settings.difficulty = old.nextDifficulty; restored = true;
    }
  }
  state.settings = { ...defaults, ...state.settings };
  $('version').textContent = `MYjong ${loaded.version}`;
  bind(); appearance(); render(loaded.recovered ? 'Your previous puzzle could not be restored. A safety copy was kept, and a fresh puzzle is ready.' : restored ? 'Welcome back. Your puzzle is just as you left it.' : 'A fresh puzzle, just for you.'); save(true);
}
init().catch(error => { $('status').textContent = `MYjong could not load your data: ${error.message}. Your existing files have been preserved.`; });
