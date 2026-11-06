/** Sound Lab controller: UI is detached from simulation and uses its shared
 * sound pack; previews always require a deliberate user gesture. */
import {SOUND_CATALOG,SOUND_GROUPS,SOUND_BY_ID,SOUND_VARIANTS,
 defaultSoundSettings,resolveSoundSettings,readSoundPack,saveSoundPack,
 normalizeSoundPack,type SoundEntry,type SoundSettings,type Variant}
 from './sound-catalog.ts';
import {renderSound,playDesignedSound,encodeSoundWav,downloadSound,
 packageSoundZip} from './sound-synth.ts';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let pack=readSoundPack();
let selected=SOUND_CATALOG[0].id;
let variant:Variant=pack.choices[selected].choice;
let group='all',status='all',search='';
let context:AudioContext|null=null;
let active:AudioBufferSourceNode|null=null,sequence=0;
let waveFrame=0;
const sliderDefs:[
 keyof SoundSettings,string,number,number,number,string
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
 active=playDesignedSound(ctx,selected,{...settings(v),
  gain:settings(v).gain*pack.master});
 note('AUDITIONING '+current().label.toUpperCase()+' · VARIANT '+v);
}
async function compare(){
 stopAudio();const token=sequence;
 const ctx=await audioContext();if(!ctx||sequence!==token)return;
 const soundId=selected;
 for(const v of SOUND_VARIANTS){
  if(token!==sequence||selected!==soundId)return;
  note('A/B/C COMPARISON · '+soundId.toUpperCase()+' · '+v);
  const source=playDesignedSound(ctx,soundId,{
    ...settings(v),gain:settings(v).gain*pack.master});
  if(!source)break;
  active=source;
  await new Promise<void>(resolve=>{
   const cleanup=source.onended;
   source.onended=(event)=>{cleanup?.call(source,event);resolve();};
  });
  if(token!==sequence)return;
  await new Promise<void>(resolve=>setTimeout(resolve,170));
 }
 if(token===sequence){active=null;note('COMPARISON FINISHED · SELECT YOUR FAVORITE VARIANT');}
}
function selectCue(id:string){
 if(!SOUND_BY_ID.has(id))return;
 stopAudio();selected=id;variant=currentChoice().choice;
 renderList();renderEditor();
}
function markChoice(v:Variant){
 const s=currentChoice();s.choice=v;s.enabled=true;s.reviewed=true;
 variant=v;persist();renderAll();
 note('APPROVED '+current().label.toUpperCase()+' · VARIANT '+v);
}
function stats(){
 const choices=Object.values(pack.choices);
 const done=choices.filter(c=>c.reviewed).length;
 ui.total.textContent=String(SOUND_CATALOG.length);
 ui.reviewed.textContent=String(done);
 ui.enabledCount.textContent=String(choices.filter(c=>c.enabled).length);
 ui.live.textContent=String(SOUND_CATALOG.filter(e=>e.status==='live').length);
 ui.fill.style.width=(100*done/SOUND_CATALOG.length).toFixed(1)+'%';
 ui.master.value=String(Math.round(pack.master*100));
 ui.masterValue.textContent=Math.round(pack.master*100)+'%';
}
function matches(entry:SoundEntry){
 const choice=pack.choices[entry.id];
 if(group!=='all'&&entry.group!==group)return false;
 if(search&&!((entry.label+' '+entry.id+' '+entry.family).toLowerCase().includes(search)))
  return false;
 if(status==='unreviewed'&&choice.reviewed)return false;
 if(status==='reviewed'&&!choice.reviewed)return false;
 if(status==='enabled'&&!choice.enabled)return false;
 if(status==='favorite'&&!choice.favorite)return false;
 if(status==='live'&&entry.status!=='live')return false;
 if(status==='planned'&&entry.status!=='planned')return false;
 return true;
}
function renderGroups(){
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
 const visible=SOUND_CATALOG.filter(matches);
 for(const entry of visible){
  const choice=pack.choices[entry.id],button=document.createElement('button');
  button.type='button';button.className='cue'+(selected===entry.id?' selected':'');
  button.dataset.cue=entry.id;
  button.setAttribute('aria-current',String(selected===entry.id));
  const dot=document.createElement('i');
  dot.className='dot'+(choice.reviewed?' reviewed':
    entry.status==='live'?' live':'');
  dot.setAttribute('aria-hidden','true');
  const txt=document.createElement('span');txt.className='cue-txt';
  const label=document.createElement('strong');label.textContent=entry.label;
  const sub=document.createElement('small');
  sub.textContent=(entry.status==='live'?'GAME HOOK':'CANDIDATE')+
   (choice.reviewed?' · REVIEWED':' · TO REVIEW')+
   (choice.favorite?' · ★':'')+
   (!choice.enabled?' · MUTED':'');
  txt.append(label,sub);
  const tag=document.createElement('span');tag.className='variant-tag';
  tag.textContent=choice.choice;
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
 const names={A:['CLEAN','Tight, deliberate, relatively dry'],
 B:['WEIGHTY','Fuller body and a solid mechanical feel'],
 C:['TEXTURED','Rougher grain, brighter edge, longer tail']};
 const frag=document.createDocumentFragment();
 for(const v of SOUND_VARIANTS){
  const [name,description]=names[v],div=document.createElement('section');
  div.className='variant'+(currentChoice().choice===v?' active':'');
  const heading=document.createElement('h3');
  heading.textContent=v;
  const small=document.createElement('small');small.textContent=name;
  heading.append(small);
  const text=document.createElement('p');text.textContent=description;
  const actions=document.createElement('div');actions.className='actions';
  const play=document.createElement('button');
  play.type='button';play.dataset.play=v;play.textContent='▶ PLAY';
  play.setAttribute('aria-label','Play variant '+v);
  const choose=document.createElement('button');choose.className='choose';
  choose.type='button';choose.dataset.choose=v;
  choose.textContent=currentChoice().choice===v&&currentChoice().reviewed?
   '✓ CHOSEN':'USE '+v;
  choose.setAttribute('aria-label','Approve variant '+v);
  actions.append(play,choose);div.append(heading,text,actions);frag.append(div);
 }
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
 const pcm=renderSound(selected,settings(),11025);
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
 ctx.fillText('ORIGINAL PROCEDURAL WAVEFORM / '+variant,12,19);
}
function scheduleWave(){
 cancelAnimationFrame(waveFrame);waveFrame=requestAnimationFrame(renderWave);
}
function renderEditor(){
 const entry=current(),choice=currentChoice();
 ui.eyebrow.textContent='SOUND / '+entry.id.toUpperCase();
 ui.name.textContent=entry.label;
 ui.description.textContent=entry.description;
 ui.cueStatus.textContent=entry.status==='live'?'GAMEPLAY CONNECTED':'PROPOSED / LAB ONLY';
 ui.cueStatus.className='status'+(entry.status==='live'?' live':'');
 ui.editing.textContent='EDITING '+variant;
 ui.enabled.checked=choice.enabled;
 ui.favorite.setAttribute('aria-pressed',String(!!choice.favorite));
 ui.favorite.textContent=choice.favorite?'★ FAVORITED':'☆ FAVORITE';
 ui.review.textContent=choice.reviewed?'✓ REVIEWED':'MARK REVIEWED';
 renderVariants();renderSliders();scheduleWave();
}
function renderAll(){
 stats();renderGroups();renderList();renderEditor();
}
function nextUnreviewed(){
 const visible=SOUND_CATALOG.filter(e=>!pack.choices[e.id].reviewed&&e.id!==selected);
 if(!visible.length){note('ALL CUES REVIEWED · YOUR PACK IS READY TO EXPORT');return;}
 const index=SOUND_CATALOG.findIndex(e=>e.id===selected);
 const next=[...visible].sort((a,b)=>
  ((SOUND_CATALOG.indexOf(a)-index+SOUND_CATALOG.length)%SOUND_CATALOG.length)-
  ((SOUND_CATALOG.indexOf(b)-index+SOUND_CATALOG.length)%SOUND_CATALOG.length))[0];
 group=next.group;status='all';search='';ui.search.value='';ui.filter.value='all';
 selectCue(next.id);renderGroups();
 note('NEXT UNREVIEWED · '+next.label.toUpperCase());
}
function updateSetting(key:keyof SoundSettings,value:number){
 const choice=currentChoice();
 choice.edits??={};
 choice.edits[variant]={...settings(),[key]:value};
 persist();scheduleWave();
}
function downloadJson(){
 downloadSound([JSON.stringify(pack,null,2)],
   'fieldwork-sound-pack-v1.json','application/json');
 note('EXPORTED YOUR COMPLETE A/B/C SOUND PACK · JSON');
}
async function exportZip(){
 const button=ui.exportWavs;button.disabled=true;
 try{
  const files:{name:string;data:Uint8Array}[]=[];
  files.push({name:'fieldwork-sound-pack.json',
   data:new TextEncoder().encode(JSON.stringify(pack,null,2))});
  const enabled=SOUND_CATALOG.filter(e=>pack.choices[e.id].enabled);
  for(let i=0;i<enabled.length;i++){
   const entry=enabled[i],choice=pack.choices[entry.id];
   const sound=resolveSoundSettings(pack,entry.id,choice.choice)!;
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
  variant=currentChoice().choice;renderAll();
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
$('compare').addEventListener('click',()=>void compare());
$('resetVariant').addEventListener('click',()=>{
 const choice=currentChoice();
 if(choice.edits){delete choice.edits[variant];}
 persist();renderEditor();note('RESET '+variant+' TO ITS ORIGINAL SOUND');
});
$('exportCue').addEventListener('click',()=>{
 const pcm=renderSound(selected,settings()).map(v=>v*settings().gain*pack.master*.4);
 downloadSound([encodeSoundWav(pcm).buffer as ArrayBuffer],
  'fieldwork-'+selected+'-'+variant+'.wav','audio/wav');
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
 if(event.key==='1'||event.key==='2'||event.key==='3'){
  const v=SOUND_VARIANTS[Number(event.key)-1];variant=v;
  renderEditor();void preview(v);
 }else if(event.key==='Escape'){stopAudio();}
});
renderAll();
