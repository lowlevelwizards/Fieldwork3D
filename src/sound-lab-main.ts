/** Sound Lab controller: UI is detached from simulation and uses its shared
 * sound pack; previews always require a deliberate user gesture. */
import {SOUND_CATALOG,SOUND_GROUPS,SOUND_BY_ID,SOUND_VARIANTS,
 defaultSoundSettings,resolveSoundSettings,resolvePlayableSoundSettings,
 readSoundPack,saveSoundPack,
 normalizeSoundPack,type SoundEntry,type SoundSettings,type Variant}
 from './sound-catalog.ts';
import {renderSound,playDesignedSound,encodeSoundWav,downloadSound,
 packageSoundZip} from './sound-synth.ts';
import {FOCUS_SOUND_IDS,FOCUS_BY_ID,FOCUS_DIRECTIONS,
 DIRECTION_METHODS} from './sound-focus.ts';
import {REFINEMENT_SOUND_IDS,REFINEMENT_BY_ID,REFINEMENT_DIRECTIONS,
 REFINEMENT_RECIPES,type RefinementDirection} from './sound-refine.ts';
import {COMPOUND_SOUND_IDS,COMPOUND_BY_ID,COMPOUND_DIRECTIONS,
 COMPOUND_RECIPES,type CompoundDirection} from './sound-compound.ts';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let pack=readSoundPack();
let selected=COMPOUND_SOUND_IDS[0];
let focusMode=true,refineMode=false,compoundMode=true;
let variant:Variant=pack.choices[selected].compound?.choice??'A';
let group='all',status='all',search='';
function availableVariants(id=selected):readonly Variant[]{
 if(compoundMode&&COMPOUND_BY_ID.has(id))return COMPOUND_DIRECTIONS;
 if(refineMode&&REFINEMENT_BY_ID.has(id))return REFINEMENT_DIRECTIONS;
 return FOCUS_BY_ID.has(id)?FOCUS_DIRECTIONS:SOUND_VARIANTS.slice(0,3);
}
let context:AudioContext|null=null;
let active:AudioBufferSourceNode|null=null,sequence=0;
let waveFrame=0;
const sliderDefs:[
 Exclude<keyof SoundSettings,'refinement'|'compound'>,string,number,number,number,string
][]=[
 ['gain','OUTPUT LEVEL',0,1,.01,'%'],
 ['pitch','PITCH / BODY',45,2400,1,'Hz'],
 ['length','DURATION',.035,3.8,.005,'s'],
 ['noise','GRAIN / NOISE',0,1,.01,'%'],
 ['punch','ATTACK / PUNCH',0,1,.01,'%'],
 ['brightness','BRIGHTNESS',0,1,.01,'%'],
 ['tail','DECAY / TAIL',0,1,.01,'%'],
 ['room','ROOM / REFLECTION',0,1,.01,'%']
];
const ui={
 total:$('totalCount'),reviewed:$('reviewCount'),enabledCount:$('enabledCount'),
 live:$('liveCount'),fill:$('progressFill'),groups:$('groups'),list:$('cueList'),
 name:$('cueName'),eyebrow:$('cueEyebrow'),description:$('cueDescription'),
 cueStatus:$('cueStatus'),variants:$('variantGrid'),editing:$('editingLabel'),
 sliders:$('sliders'),wave:$<HTMLCanvasElement>('waveform'),
 enabled:$<HTMLInputElement>('enabled'),favorite:$('favorite'),
 review:$('markReviewed'),master:$<HTMLInputElement>('master'),
 masterValue:$('masterValue'),feedback:$('feedback'),
 filter:$<HTMLSelectElement>('statusFilter'),search:$<HTMLInputElement>('search'),
 exportWavs:$<HTMLButtonElement>('exportWavs'),
 importFile:$<HTMLInputElement>('importFile')
};
function current(){return SOUND_BY_ID.get(selected)!;}
function currentChoice(){return pack.choices[selected];}
function settings(v:Variant=variant){
 return resolveSoundSettings(pack,selected,v)??defaultSoundSettings(current(),v);
}
function baselineSettings(){
 return resolveSoundSettings(pack,selected,currentChoice().choice)!;
}
function waveTwoSettings(){
 const ref=currentChoice().refinement?.choice??'A';
 const index=REFINEMENT_DIRECTIONS.indexOf(ref);
 return {...baselineSettings(),refinement:index<0?0:index};
}
function auditionSettings(v:Variant=variant){
 if(compoundMode)return {...waveTwoSettings(),
  compound:COMPOUND_DIRECTIONS.indexOf(v as CompoundDirection)};
 if(refineMode)return {...baselineSettings(),
  refinement:REFINEMENT_DIRECTIONS.indexOf(v as RefinementDirection)};
 return settings(v);
}
function note(text:string){ui.feedback.textContent=text;}
function persist(){if(!saveSoundPack(pack))
 note('LOCAL STORAGE UNAVAILABLE · EXPORT JSON TO KEEP YOUR WORK');}
function stopAudio(){
 sequence++;
 if(active){try{active.stop();}catch{/* sound may have ended */}active=null;}
}
async function audioContext(){
 try{
  context??=new AudioContext();
  if(context.state!=='running')await context.resume();
  return context.state==='running'?context:null;
 }catch{note('AUDIO UNAVAILABLE · CHECK SOUND PERMISSIONS');return null;}
}
async function preview(v:Variant=variant){
 stopAudio();const token=sequence;
 const ctx=await audioContext();if(!ctx||token!==sequence)return;
 const sound=auditionSettings(v);
 active=playDesignedSound(ctx,selected,{...sound,
  gain:sound.gain*pack.master});
 note('AUDITIONING '+current().label.toUpperCase()+' · '+(compoundMode?'COMPOUND ':refineMode?'REFINEMENT ':'VARIANT ')+v);
}
async function compare(all=false){
 stopAudio();const token=sequence;
 const ctx=await audioContext();if(!ctx||sequence!==token)return;
 const soundId=selected;
 const list=compoundMode?(all?COMPOUND_DIRECTIONS:
   (currentChoice().compound?.shortlist?.length?currentChoice().compound!.shortlist!:[])):
  refineMode?(all?REFINEMENT_DIRECTIONS:
   (currentChoice().refinement?.shortlist?.length?currentChoice().refinement!.shortlist!:[])):
  focusMode?(all?FOCUS_DIRECTIONS:
   (currentChoice().shortlist?.length?currentChoice().shortlist!:[])):
   availableVariants();
 if(!list.length){note('SHORTLIST A FEW IDEAS FIRST · TAP ☆ SHORTLIST UNDER THE SOUNDS YOU LIKE');return;}
 for(const v of list){
  if(token!==sequence||selected!==soundId)return;
  note('LISTENING · '+soundId.toUpperCase()+' · DIRECTION '+v);
  const sound=auditionSettings(v);
  const source=playDesignedSound(ctx,soundId,{
    ...sound,gain:sound.gain*pack.master});
  if(!source)break;
  active=source;
  await new Promise<void>(resolve=>{
   const cleanup=source.onended;
   source.onended=(event)=>{cleanup?.call(source,event);resolve();};
  });
  if(token!==sequence)return;
  await new Promise<void>(resolve=>setTimeout(resolve,170));
 }
 if(token===sequence){active=null;note('COMPARISON FINISHED · CHOOSE THE DIRECTION YOU WANT TO DEVELOP');}
}
async function previewOriginal(){
 stopAudio();const token=sequence;
 const ctx=await audioContext();if(!ctx||token!==sequence)return;
 const sound=compoundMode?waveTwoSettings():baselineSettings();
 active=playDesignedSound(ctx,selected,{...sound,gain:sound.gain*pack.master});
 note('YOUR '+(compoundMode?'WAVE 02':'WAVE 01')+
  ' REFERENCE · '+current().label.toUpperCase());
});
async function previewWaveOne(){
 if(!compoundMode)return;
 stopAudio();const token=sequence;
 const ctx=await audioContext();if(!ctx||token!==sequence)return;
 const sound=baselineSettings();
 active=playDesignedSound(ctx,selected,{...sound,gain:sound.gain*pack.master});
 note('WAVE 01 ORIGINAL · '+current().label.toUpperCase()+' · '+currentChoice().choice);
}
async function compareOriginal(){
 if(!refineMode&&!compoundMode)return;
 stopAudio();const token=sequence;
 const ctx=await audioContext();if(!ctx||token!==sequence)return;
 const soundId=selected;
 for(const [label,sound] of [
   ['REFERENCE',compoundMode?waveTwoSettings():baselineSettings()],
   [(compoundMode?'COMPOUND ':'REFINED ')+variant,auditionSettings()]
 ] as const){
  if(token!==sequence||soundId!==selected)return;
  note('A/B LEVEL-MATCHED · '+soundId.toUpperCase()+' · '+label);
  const source=playDesignedSound(ctx,soundId,{...sound,gain:sound.gain*pack.master});
  if(!source)break;active=source;
  await new Promise<void>(resolve=>{
   const cleanup=source.onended;
   source.onended=(event)=>{cleanup?.call(source,event);resolve();};
  });
  if(token!==sequence)return;
  await new Promise<void>(resolve=>setTimeout(resolve,180));
 }
 if(token===sequence)note('A/B COMPLETE · YOUR ORIGINAL REMAINS AVAILABLE');
}
function selectCue(id:string){
 if(!SOUND_BY_ID.has(id))return;
 stopAudio();selected=id;variant=compoundMode?
  (currentChoice().compound?.choice??'A'):refineMode?
  (currentChoice().refinement?.choice??'A'):currentChoice().choice;
 renderList();renderEditor();
}
function markChoice(v:Variant){
 const s=currentChoice();
 if(compoundMode){
  if(!s.refinement?.approved){
   note('IMPORT YOUR WAVE 02 PACK OR APPROVE A WAVE 02 SOUND FIRST');return;
  }
  s.compound??={};s.compound.choice=v as CompoundDirection;
  s.compound.approved=true;s.enabled=true;
  variant=v;persist();renderAll();
  note('WAVE 03 CHOSEN · '+current().label.toUpperCase()+' · '+v+
   ' · WAVES 01 AND 02 PRESERVED');return;
 }
 if(refineMode){
  if(!s.explored){note('FIRST CHOOSE A WAVE 01 REFERENCE SOUND FOR THIS CUE');return;}
  s.refinement??={};
  if(s.refinement.choice!==v&&s.compound?.approved)s.compound.approved=false;
  s.refinement.choice=v as RefinementDirection;
  s.refinement.approved=true;
  s.enabled=true;
  variant=v;persist();renderAll();
  note('WAVE 02 APPROVED · '+current().label.toUpperCase()+' · '+v+' · WAVE 01 PRESERVED');
  return;
 }
 if(s.choice!==v){if(s.refinement?.approved)s.refinement.approved=false;
  if(s.compound?.approved)s.compound.approved=false;}
 s.choice=v;s.enabled=true;s.reviewed=true;
 if(FOCUS_BY_ID.has(selected))s.explored=true;
 variant=v;persist();renderAll();
 note('APPROVED '+current().label.toUpperCase()+' · VARIANT '+v);
}
function stats(){
 const entries=refineMode?REFINEMENT_SOUND_IDS:focusMode?FOCUS_SOUND_IDS:SOUND_CATALOG.map(e=>e.id);
 const choices=entries.map(id=>pack.choices[id]);
 const done=choices.filter(c=>refineMode?c.refinement?.approved:focusMode?c.explored:c.reviewed).length;
 ui.total.textContent=String(entries.length);
 ui.reviewed.textContent=String(done);
 ui.enabledCount.textContent=String(choices.filter(c=>c.enabled).length);
 ui.live.textContent=String(entries.filter(id=>SOUND_BY_ID.get(id)?.status==='live').length);
 ui.fill.style.width=(100*done/entries.length).toFixed(1)+'%';
 $('totalLabel').textContent=refineMode?'REFINEMENT STUDIES':focusMode?'IN THIS ROUND':'CUE OPPORTUNITIES';
 $('reviewLabel').textContent=refineMode?'REFINEMENTS CHOSEN':focusMode?'DIRECTIONS CHOSEN':'REVIEWED';
 const counts=new Map<string,number>();
 for(const id of FOCUS_SOUND_IDS){const c=pack.choices[id];if(c.explored)
  counts.set(c.choice,(counts.get(c.choice)??0)+1);}
 const ranked=[...counts].sort((a,b)=>b[1]-a[1]);
 $('profileHint').textContent=refineMode?(ranked.length?
  'YOUR WAVE 01 SIGNALS · '+ranked.map(([v,n])=>v+' ×'+n).join(' · ')+
  ' · THIS ROUND TESTS WHAT YOU LIKE INSIDE THOSE CHARACTERS':
  'IMPORT YOUR WAVE 01 JSON ABOVE TO BRING IN YOUR ORIGINAL CHOICES'):
  '';
 ui.master.value=String(Math.round(pack.master*100));
 ui.masterValue.textContent=Math.round(pack.master*100)+'%';
}
function matches(entry:SoundEntry){
 const choice=pack.choices[entry.id];
 if(refineMode&&!REFINEMENT_BY_ID.has(entry.id))return false;
 if(focusMode&&!FOCUS_BY_ID.has(entry.id))return false;
 if(group!=='all'&&entry.group!==group)return false;
 if(search&&!((entry.label+' '+entry.id+' '+entry.family).toLowerCase().includes(search)))
  return false;
 const reviewed=refineMode?!!choice.refinement?.approved:focusMode?!!choice.explored:!!choice.reviewed;
 if(status==='unreviewed'&&reviewed)return false;
 if(status==='reviewed'&&!reviewed)return false;
 if(status==='enabled'&&!choice.enabled)return false;
 if(status==='favorite'&&!choice.favorite)return false;
 if(status==='live'&&entry.status!=='live')return false;
 if(status==='planned'&&entry.status!=='planned')return false;
 return true;
}
function renderGroups(){
 if(focusMode){ui.groups.replaceChildren();return;}
 const defs:[string,string][]= [['all','ALL']];
 for(const [id,title] of SOUND_GROUPS)defs.push([id,title]);
 const frag=document.createDocumentFragment();
 for(const [id,name] of defs){
  const count=id==='all'?SOUND_CATALOG.length:
   SOUND_CATALOG.filter(e=>e.group===id).length;
  const button=document.createElement('button');
  button.type='button';button.dataset.group=id;
  button.setAttribute('aria-pressed',String(group===id));
  button.textContent=name+' ';
  const small=document.createElement('small');small.textContent=String(count);
  button.append(small);frag.append(button);
 }
 ui.groups.replaceChildren(frag);
}
function renderList(){
 const frag=document.createDocumentFragment();
 const candidates=refineMode?REFINEMENT_SOUND_IDS.map(id=>SOUND_BY_ID.get(id)!):
  focusMode?FOCUS_SOUND_IDS.map(id=>SOUND_BY_ID.get(id)!):SOUND_CATALOG;
 const visible=candidates.filter(matches);
 for(const entry of visible){
  const choice=pack.choices[entry.id],reviewed=refineMode?
   choice.refinement?.approved:focusMode?choice.explored:choice.reviewed;
  const button=document.createElement('button');
  button.type='button';button.className='cue'+(selected===entry.id?' selected':'');
  button.dataset.cue=entry.id;
  button.setAttribute('aria-current',String(selected===entry.id));
  if(focusMode){const rank=document.createElement('span');rank.className='rank';
   rank.textContent=String((refineMode?REFINEMENT_SOUND_IDS:FOCUS_SOUND_IDS).indexOf(entry.id)+1).padStart(2,'0');
   button.append(rank);}
  const dot=document.createElement('i');
  dot.className='dot'+(reviewed?' reviewed':
    entry.status==='live'?' live':'');
  dot.setAttribute('aria-hidden','true');
  const txt=document.createElement('span');txt.className='cue-txt';
  const label=document.createElement('strong');label.textContent=entry.label;
  const sub=document.createElement('small');
  sub.textContent=(entry.status==='live'?'GAME HOOK':'CANDIDATE')+
   (reviewed?' · CHOSEN':refineMode?' · TO REFINE':' · TO EXPLORE')+
   (choice.favorite?' · ★':'')+
   (!choice.enabled?' · MUTED':'');
  txt.append(label,sub);
  const tag=document.createElement('span');tag.className='variant-tag';
  tag.textContent=refineMode?'R2 '+(choice.refinement?.approved?choice.refinement.choice:'—'):choice.choice;
  button.append(dot,txt,tag);frag.append(button);
 }
 if(!visible.length){
  const empty=document.createElement('p');
  empty.style.cssText='padding:16px;color:#aab9b1';
  empty.textContent='No sounds match. Try another filter.';
  frag.append(empty);
 }
 ui.list.replaceChildren(frag);
 ui.list.querySelector<HTMLButtonElement>('.cue.selected')?.
  scrollIntoView({block:'nearest'});
}
function renderVariants(){
 const legacy:Record<string,[string,string]>={
  A:['CLEAN','Tight, deliberate, relatively dry'],
  B:['WEIGHTY','Fuller body and a solid mechanical feel'],
  C:['TEXTURED','Rougher grain, brighter edge, longer tail']};
 const focus=FOCUS_BY_ID.get(selected),refine=refineMode?REFINEMENT_BY_ID.get(selected):null;
 const frag=document.createDocumentFragment();
 for(const [i,v] of availableVariants().entries()){
  const [name,description]=refine?[refine.names[i],refine.details[i]]:
   focus?[focus.names[i],DIRECTION_METHODS[i]]:legacy[v];
  const div=document.createElement('section');
  const chosen=refineMode?
   (currentChoice().refinement?.choice===v&&!!currentChoice().refinement?.approved):
   (currentChoice().choice===v&&
   (focus?!!currentChoice().explored:!!currentChoice().reviewed));
  const shortlisted=refineMode?
    !!currentChoice().refinement?.shortlist?.includes(v as RefinementDirection):
    !!currentChoice().shortlist?.includes(v);
  div.className='variant'+(chosen?' active':'')+(shortlisted?' shortlisted':'');
  const heading=document.createElement('h3');heading.textContent=v;
  const small=document.createElement('small');small.textContent=name;
  heading.append(small);
  const text=document.createElement('p');text.textContent=description;
  const actions=document.createElement('div');actions.className='actions';
  if(refine){
   const layer=document.createElement('div');layer.className='layer-tags';
   for(const stem of REFINEMENT_RECIPES[i].layers){
    const tag=document.createElement('span');tag.textContent=stem;
    layer.append(tag);
   }
   div.append(heading,text,layer);
  }else div.append(heading,text);
  const play=document.createElement('button');
  play.type='button';play.dataset.play=v;play.textContent='▶ LISTEN';
  play.setAttribute('aria-label','Listen to '+name+' for '+current().label);
  actions.append(play);
  if(focus){
   const shortlist=document.createElement('button');
   shortlist.type='button';shortlist.className='shortlist';
   shortlist.dataset.shortlist=v;shortlist.setAttribute('aria-pressed',String(shortlisted));
   shortlist.textContent=shortlisted?'★ SAVED':'☆ SHORTLIST';
   actions.append(shortlist);
  }
  const choose=document.createElement('button');choose.className='choose';
  choose.type='button';choose.dataset.choose=v;
  choose.textContent=chosen?'✓ CHOSEN':'CHOOSE '+v;
  choose.disabled=!!refine&&!currentChoice().explored;
  choose.title=choose.disabled?'Choose a Wave 01 reference first':name;
  choose.setAttribute('aria-label','Choose '+name);
  actions.append(choose);div.append(actions);frag.append(div);
 }
 ui.variants.classList.toggle('explore',!!focus);
 ui.variants.classList.toggle('refinement',refineMode);
 ui.variants.replaceChildren(frag);
}
function displayValue(value:number,unit:string){
 return unit==='%'?Math.round(value*100)+'%':
  unit==='Hz'?Math.round(value)+'Hz':value.toFixed(2)+'s';
}
function renderSliders(){
 const frag=document.createDocumentFragment();
 for(const [key,label,min,max,step,unit] of sliderDefs){
  const row=document.createElement('label');
  const heading=document.createElement('div');heading.className='slider-name';
  const name=document.createElement('span');name.textContent=label;
  const out=document.createElement('output');out.dataset.value=key;
  out.textContent=displayValue(settings()[key],unit);
  heading.append(name,out);
  const input=document.createElement('input');
  input.type='range';input.dataset.setting=key;input.min=String(min);
  input.max=String(max);input.step=String(step);
  input.value=String(settings()[key]);
  input.setAttribute('aria-label',label);
  row.append(heading,input);frag.append(row);
 }
 ui.sliders.replaceChildren(frag);
}
function renderWave(){
 const canvas=ui.wave,ctx=canvas.getContext('2d');
 if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#0d191c';ctx.fillRect(0,0,w,h);
 const pcm=renderSound(selected,auditionSettings(),11025);
 if(!pcm.length)return;
 ctx.strokeStyle='#243e40';ctx.lineWidth=1;
 for(let x=0;x<w;x+=60){ctx.beginPath();ctx.moveTo(x,0);
  ctx.lineTo(x,h);ctx.stroke();}
 ctx.strokeStyle='#a8d3b3';ctx.lineWidth=1.5;ctx.beginPath();
 const mid=h/2;
 for(let x=0;x<w;x++){
  const from=Math.floor(x*pcm.length/w),to=Math.max(from+1,
   Math.floor((x+1)*pcm.length/w));
  let min=1,max=-1;
  for(let i=from;i<to;i++){min=Math.min(min,pcm[i]);max=Math.max(max,pcm[i]);}
  ctx.moveTo(x,mid-min*mid*.85);ctx.lineTo(x,mid-max*mid*.85);
 }
 ctx.stroke();
 ctx.fillStyle='#8ca69f';ctx.font='12px sans-serif';
 ctx.fillText((refineMode?'LAYERED REFINEMENT':'WAVE 01')+' / '+variant,12,19);
}
function scheduleWave(){
 cancelAnimationFrame(waveFrame);waveFrame=requestAnimationFrame(renderWave);
}
function renderEditor(){
 const entry=current(),choice=currentChoice();
 ui.eyebrow.textContent='SOUND / '+entry.id.toUpperCase();
 ui.name.textContent=entry.label;
 const focus=FOCUS_BY_ID.get(entry.id);
 const refinement=refineMode?REFINEMENT_BY_ID.get(entry.id):null;
 ui.description.textContent=refinement?
  refinement.intent+(choice.explored?'':' · Choose your Wave 01 reference first.'):
  focus?focus.why+' · Listen broadly; shortlist first, choose later.':entry.description;
 $('auditionHeading').textContent=refineMode?'02 / SIX REFINEMENTS OF YOUR ORIGINAL':
  focus?'02 / EIGHT SOUND IDEAS':'02 / A·B·C AUDITION';
 $('compareHint').textContent=refineMode?'KEEP ORIGINAL · TEST LAYERS · CHOOSE':
  focus?'LISTEN · SHORTLIST · CHOOSE':'LISTEN · CHOOSE';
 $('compare').textContent=focus?'▶ PLAY SHORTLIST':'▶ PLAY A → B → C';
 ($<HTMLButtonElement>('compareAll')).hidden=!focus;
 ($<HTMLButtonElement>('compareAll')).textContent=refineMode?'▶ PLAY ALL 6':'▶ PLAY ALL 8';
 ($<HTMLButtonElement>('compareBase')).hidden=!refineMode;
 ($<HTMLElement>('baselinePanel')).hidden=!refineMode;
 ($<HTMLDetailsElement>('advancedTune')).hidden=refineMode;
 $('baselineLabel').textContent=refineMode?
  'Original '+choice.choice+' · '+(choice.explored?'Your approved Wave 01 pick.':'Not yet approved. Open Wave 01 to choose.')+
  ' · Every refinement is built from this sound.':'';
 ui.cueStatus.textContent=entry.status==='live'?'GAMEPLAY CONNECTED':'PROPOSED / LAB ONLY';
 ui.cueStatus.className='status'+(entry.status==='live'?' live':'');
 ui.editing.textContent='EDITING '+(refineMode?currentChoice().choice:variant);
 ui.enabled.checked=choice.enabled;
 ui.favorite.setAttribute('aria-pressed',String(!!choice.favorite));
 ui.favorite.textContent=choice.favorite?'★ FAVORITED':'☆ FAVORITE';
 ui.review.textContent=choice.reviewed?'✓ REVIEWED':'MARK REVIEWED';
 ui.review.hidden=!!focus;
 renderVariants();renderSliders();scheduleWave();
}
function renderAll(){
 stats();renderGroups();renderList();renderEditor();
}
function nextUnreviewed(){
 const candidates=refineMode?REFINEMENT_SOUND_IDS.map(id=>SOUND_BY_ID.get(id)!):
  focusMode?FOCUS_SOUND_IDS.map(id=>SOUND_BY_ID.get(id)!):SOUND_CATALOG;
 const visible=candidates.filter(e=>
  !(refineMode?pack.choices[e.id].refinement?.approved:
   focusMode?pack.choices[e.id].explored:pack.choices[e.id].reviewed)&&e.id!==selected);
 if(!visible.length){note('ALL CUES REVIEWED · YOUR PACK IS READY TO EXPORT');return;}
 const index=candidates.findIndex(e=>e.id===selected);
 const next=[...visible].sort((a,b)=>
  ((candidates.indexOf(a)-index+candidates.length)%candidates.length)-
  ((candidates.indexOf(b)-index+candidates.length)%candidates.length))[0];
 group=next.group;status='all';search='';ui.search.value='';ui.filter.value='all';
 selectCue(next.id);renderGroups();
 note('NEXT UNREVIEWED · '+next.label.toUpperCase());
}
function updateSetting(key:keyof SoundSettings,value:number){
 const choice=currentChoice();
 if(choice.refinement?.approved)choice.refinement.approved=false;
 choice.edits??={};
 choice.edits[variant]={...settings(),[key]:value};
 persist();scheduleWave();
}
function downloadJson(){
 downloadSound([JSON.stringify(pack,null,2)],
   'fieldwork-sound-pack-v1.json','application/json');
 note('EXPORTED YOUR COMPLETE SOUND PACK · EIGHT-DIRECTION CHOICES INCLUDED');
}
async function exportZip(){
 const button=ui.exportWavs;button.disabled=true;
 try{
  const files:{name:string;data:Uint8Array}[]=[];
  files.push({name:'fieldwork-sound-pack.json',
   data:new TextEncoder().encode(JSON.stringify(pack,null,2))});
  const enabled=SOUND_CATALOG.filter(e=>pack.choices[e.id].enabled);
  for(let i=0;i<enabled.length;i++){
   const entry=enabled[i];
   const sound=resolvePlayableSoundSettings(pack,entry.id)!;
   const pcm=renderSound(entry.id,sound).map(v=>v*sound.gain*pack.master*.4);
   files.push({name:'wavs/'+entry.id+'.wav',data:encodeSoundWav(pcm)});
   if(i%10===0){
    note('RENDERING '+(i+1)+' / '+enabled.length+' APPROVED/ENABLED CUES');
    await new Promise<void>(resolve=>setTimeout(resolve,0));
   }
  }
  downloadSound([packageSoundZip(files).buffer as ArrayBuffer],
   'fieldwork-sound-pack-v1.zip','application/zip');
  note('EXPORTED '+enabled.length+' ENABLED WAVS + EDITABLE JSON MANIFEST');
 }catch(error){note('EXPORT FAILED · '+String(error));}
 finally{button.disabled=false;}
}
async function importJson(file:File){
 try{
  if(file.size>3_000_000)throw Error('File is too large');
  const raw=JSON.parse(await file.text()) as {version?:unknown};
  if(raw.version!==1)throw Error('Expected a version 1 sound pack');
  stopAudio();pack=normalizeSoundPack(raw);persist();
  variant=refineMode?(currentChoice().refinement?.choice??'A'):
   currentChoice().choice;renderAll();
  note('PACK IMPORTED · '+file.name+' · LIVE CUES UPDATED');
 }catch(error){note('IMPORT FAILED · '+String(error));}
 ui.importFile.value='';
}
ui.groups.addEventListener('click',event=>{
 const node=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-group]');
 if(!node)return;
 group=node.dataset.group??'all';renderGroups();renderList();
});
ui.list.addEventListener('click',event=>{
 const node=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-cue]');
 if(node?.dataset.cue)selectCue(node.dataset.cue);
});
ui.variants.addEventListener('click',event=>{
 const node=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
 if(!node)return;
 if(node.dataset.play){const v=node.dataset.play as Variant;
  variant=v;renderEditor();void preview(v);}
 if(node.dataset.choose)markChoice(node.dataset.choose as Variant);
 if(node.dataset.shortlist){const v=node.dataset.shortlist as Variant;
  const c=currentChoice();
  let saved=false;
  if(refineMode){
   c.refinement??={};const list=c.refinement.shortlist??[];
   c.refinement.shortlist=list.includes(v as RefinementDirection)?
    list.filter(x=>x!==v):[...list,v as RefinementDirection];
   saved=c.refinement.shortlist.includes(v as RefinementDirection);
  }else{
   c.shortlist??=[];
   c.shortlist=c.shortlist.includes(v)?c.shortlist.filter(x=>x!==v):[...c.shortlist,v];
   saved=c.shortlist.includes(v);
  }
  persist();renderVariants();
  note(saved?'SHORTLISTED DIRECTION '+v:'REMOVED DIRECTION '+v+' FROM SHORTLIST');
 }
});
ui.sliders.addEventListener('input',event=>{
 const input=event.target as HTMLInputElement;
 const key=input.dataset.setting as keyof SoundSettings|undefined;
 if(!key)return;
 const value=Number(input.value);
 updateSetting(key,value);
 const def=sliderDefs.find(v=>v[0]===key)!;
 const output=ui.sliders.querySelector<HTMLOutputElement>(
  'output[data-value="'+key+'"]');
 if(output)output.textContent=displayValue(value,def[5]);
});
ui.search.addEventListener('input',()=>{search=ui.search.value.toLowerCase().trim();
 if(search)group='all';renderGroups();renderList();});
ui.filter.addEventListener('change',()=>{status=ui.filter.value;renderList();});
ui.enabled.addEventListener('change',()=>{
 currentChoice().enabled=ui.enabled.checked;
 persist();renderAll();
 note(current().label.toUpperCase()+(ui.enabled.checked?' ENABLED':' MUTED'));
});
ui.favorite.addEventListener('click',()=>{
 currentChoice().favorite=!currentChoice().favorite;persist();renderAll();
});
ui.review.addEventListener('click',()=>{
 currentChoice().reviewed=!currentChoice().reviewed;
 persist();renderAll();
});
$('next').addEventListener('click',nextUnreviewed);
$('stop').addEventListener('click',()=>{stopAudio();note('STOPPED');});
$('compare').addEventListener('click',()=>void compare(false));
$('compareAll').addEventListener('click',()=>void compare(true));
$('playBaseline').addEventListener('click',()=>void previewOriginal());
$('compareBase').addEventListener('click',()=>void compareOriginal());
$('resetVariant').addEventListener('click',()=>{
 const choice=currentChoice();
 if(choice.edits){delete choice.edits[variant];}
 persist();renderEditor();note('RESET '+variant+' TO ITS ORIGINAL SOUND');
});
$('exportCue').addEventListener('click',()=>{
 const sound=auditionSettings();
 const pcm=renderSound(selected,sound).map(v=>v*sound.gain*pack.master*.4);
 downloadSound([encodeSoundWav(pcm).buffer as ArrayBuffer],
  'fieldwork-'+selected+'-'+(refineMode?'wave2-':'')+variant+'.wav','audio/wav');
 note('EXPORTED '+current().label.toUpperCase()+' · '+variant+' WAV');
});
$('exportJson').addEventListener('click',downloadJson);
ui.exportWavs.addEventListener('click',()=>void exportZip());
$('importButton').addEventListener('click',()=>ui.importFile.click());
ui.importFile.addEventListener('change',()=>{
 const file=ui.importFile.files?.[0];if(file)void importJson(file);
});
ui.master.addEventListener('input',()=>{
 pack.master=Number(ui.master.value)/100;ui.masterValue.textContent=ui.master.value+'%';
 persist();
});
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||
  /^(INPUT|TEXTAREA|SELECT)$/.test((event.target as HTMLElement)?.tagName??''))return;
 if(/^[1-8]$/.test(event.key)&&Number(event.key)<=availableVariants().length){
  const v=SOUND_VARIANTS[Number(event.key)-1];variant=v;
  renderEditor();void preview(v);
 }else if(event.key==='Escape'){stopAudio();}
});
function switchView(view:'refine'|'focus'|'all'){
 if((refineMode?'refine':focusMode?'focus':'all')===view)return;
 stopAudio();refineMode=view==='refine';focusMode=view!=='all';
 group='all';status='all';search='';
 ui.search.value='';ui.filter.value='all';
 selected=refineMode?REFINEMENT_SOUND_IDS[0]:
  focusMode?FOCUS_SOUND_IDS[0]:SOUND_CATALOG[0].id;
 variant=refineMode?(currentChoice().refinement?.choice??'A'):currentChoice().choice;
 $('refineView').setAttribute('aria-pressed',String(refineMode));
 $('focusView').setAttribute('aria-pressed',String(view==='focus'));
 $('allView').setAttribute('aria-pressed',String(view==='all'));
 $('roundLabel').textContent=refineMode?'WAVE 02A / REFINEMENT + LAYERING':
  focusMode?'WAVE 01 / FOUNDATIONAL SOUNDS':'ARCHIVE / ALL SOUND OPPORTUNITIES';
 $('roundHelp').textContent=refineMode?
  '10 representative sounds · 6 related, layered sketches each. Your Wave 01 pick is the reference. Shortlist and choose one refinement.':
  focusMode?
   '16 high-impact sounds. Eight contrasting sketches each. Listen, shortlist and choose. Your choices here become Wave 02 reference sounds.':
   'The larger 256-cue catalog stays intact for later rounds. Both listening rounds are separate.';
 $('libraryHeading').textContent=refineMode?'01 / NEXT 10 SOUNDS TO REFINE':
  focusMode?'01 / FIRST 16 SOUNDS':'01 / FULL CUE LIBRARY';
 document.body.classList.toggle('focus-round',focusMode);
 document.body.classList.toggle('refine-round',refineMode);
 renderAll();
 note(refineMode?'WAVE 02 · LISTEN TO YOUR ORIGINAL, THEN THE LAYERED REFINEMENTS':
  focusMode?'WAVE 01 · YOUR ORIGINAL CHOICES ARE PRESERVED':'FULL SOUND LIBRARY');
}
$('refineView').addEventListener('click',()=>switchView('refine'));
$('focusView').addEventListener('click',()=>switchView('focus'));
$('allView').addEventListener('click',()=>switchView('all'));
document.body.classList.add('focus-round','refine-round');
renderAll();
