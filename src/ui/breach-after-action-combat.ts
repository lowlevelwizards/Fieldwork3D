/** V3-C: focus-first combat view; horizontal contact and shot selectors.
 * No scrolling through long forensic ledgers in the primary presentation.
 */
import type {AfterActionReport,ContactAfterAction,ReportShot}
 from '../breach-after-action-report.ts';
import {renderHitPaperDoll} from './breach-hit-paper-doll.ts';
type View={selectedContact:string|null;selectedShotId:number|null;
 side:'red'|'blue';back:boolean;inspectionMode:'paper'|'3d'};
type Actions={
 chooseContact:(id:string|null)=>void;chooseShot:(id:number|null)=>void;
 chooseSide:(side:'red'|'blue')=>void;chooseView:(back:boolean)=>void;
 chooseMode:(mode:'paper'|'3d')=>void;
 viewReplay:(contact:ContactAfterAction,shot:ReportShot|null)=>void;
};
const el=(tag:string,cls='',txt?:string)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(txt!==undefined)x.textContent=txt;return x;
};
const button=(label:string,click:()=>void,cls='fw-v3-small-button')=>{
 const b=document.createElement('button');b.type='button';b.className=cls;
 b.textContent=label;b.addEventListener('click',click);return b;
};
const stamp=(at:number)=>Math.floor(at/60)+':'+
 String(Math.floor(at%60)).padStart(2,'0');
const status=(c:ContactAfterAction)=>c.resolution==='surrendered'?'SURRENDERED':
 c.resolution==='incapacitated'?'INCAPACITATED':'UNRESOLVED';
const outcome=(s:ReportShot)=>s.down?'INCAPACITATING HIT':
 s.outcome==='armor-stopped'?'ARMOR STOP':
 s.outcome==='non-damaging'?'NO DAMAGE':
 s.outcome==='damaging'?'WOUND':
 s.outcome==='miss'?'MISS':'UNKNOWN DAMAGE';
function shotDetails(s:ReportShot){
 const part=el('div','fw-v3-shot-details');
 part.append(el('small','',stamp(s.at)+' · SHOT #'+s.id),
   el('h3','',outcome(s)),
   el('p','',s.shooterId.toUpperCase()+
     ' · '+(s.receiver??s.weapon??'UNKNOWN WEAPON')),
   el('p','',s.region?.toUpperCase()??'NO RECORDED REGION'));
 if(s.caliber)part.append(el('small','','NOMINAL '+s.caliber));
 if(s.damage!==null)part.append(el('span','fw-v3-shot-damage',
   String(s.damage)+' DAMAGE'));
 return part;
}
export function renderCombatReport(
 report:AfterActionReport,view:View,act:Actions
):HTMLElement{
 const root=el('section','fw-v3-combat');
 const all=view.side==='red'?report.hostiles:report.friendlyCasualties;
 const active=all.find(c=>c.id===view.selectedContact)??all[0]??null;
 const controls=el('div','fw-v3-combat-top');
 const side=el('div','fw-v3-switch');
 for(const kind of ['red','blue'] as const){
   const b=button(kind==='red'?'HOSTILES':'SQUAD',
     ()=>act.chooseSide(kind),'fw-v3-small-button');
   b.setAttribute('aria-pressed',String(view.side===kind));side.append(b);
 }
 controls.append(side);
 const contacts=el('div','fw-v3-contact-rail');
 contacts.setAttribute('aria-label','Contacts');
 for(const c of all){
   const b=button(c.name,()=>act.chooseContact(c.id),'fw-v3-contact-chip');
   b.setAttribute('aria-pressed',String(c.id===active?.id));
   b.title=status(c);contacts.append(b);
 }
 root.append(controls,contacts);
 if(!active){
   root.append(el('p','fw-after-empty',view.side==='red'?
     'NO HOSTILE CONTACTS RECORDED':'NO RECORDED SQUAD CASUALTIES'));
   return root;
 }
 const selected=active.shots.find(s=>s.id===view.selectedShotId)??
   active.shots.find(s=>s.id===active.finalShotId)??
   active.shots.at(-1)??null;
 const content=el('div','fw-v3-combat-focus');
 const figure=el('div','fw-v3-combat-figure');
 const figureToolbar=el('div','fw-v3-switch');
 for(const mode of ['paper','3d'] as const){
  const b=button(mode==='paper'?'2D':'3D',()=>act.chooseMode(mode));
  b.setAttribute('aria-pressed',String(view.inspectionMode===mode));figureToolbar.append(b);
 }
 figure.append(figureToolbar);
 if(view.inspectionMode==='paper'){
  const pose=el('div','fw-v3-switch');
  for(const back of [false,true]){
    const b=button(back?'BACK':'FRONT',()=>act.chooseView(back));
    b.setAttribute('aria-pressed',String(view.back===back));pose.append(b);
  }
  figure.append(renderHitPaperDoll(active,selected?.id??null,view.back),pose);
 }else{
  const model=el('div','fw-after-model','LOADING HISTORICAL MODEL');
  model.dataset.afterModel=active.id;
  figure.append(model,el('small','fw-v3-paper-key',
    'HISTORICAL EQUIPMENT · NO PRECISE IMPACT MARKERS'));
 }
 const right=el('div','fw-v3-combat-info');
 const heading=el('div','fw-v3-combat-name');
 heading.append(el('small','',view.side==='red'?'HOSTILE CONTACT':'SQUAD CASUALTY'),
   el('h2','',active.name),el('span','',status(active)));
 right.append(heading);
 if(selected)right.append(shotDetails(selected));
 else right.append(el('p','fw-after-muted','NO RECORDED SHOTS'));
 right.append(button('▶ WATCH CLIP',()=>act.viewReplay(active,selected),'fw-v3-play'));
 content.append(figure,right);root.append(content);
 if(active.shots.length){
   const sequence=el('div','fw-v3-shot-sequence');
   const prev=button('‹',()=>{
     const idx=active.shots.findIndex(s=>s.id===selected?.id);
     const shot=active.shots[Math.max(0,idx-1)];
     if(shot)act.chooseShot(shot.id);
   },'fw-v3-shot-step');
   prev.disabled=selected?.id===active.shots[0]?.id;
   const rail=el('div','fw-v3-shot-rail');rail.setAttribute('aria-label','Shots in order');
   for(const [i,s] of active.shots.entries()){
     const b=button(String(i+1),()=>act.chooseShot(s.id),'fw-v3-shot-chip');
     b.setAttribute('aria-pressed',String(s.id===selected?.id));
     b.dataset.outcome=s.outcome;rail.append(b);
   }
   const next=button('›',()=>{
     const idx=active.shots.findIndex(s=>s.id===selected?.id);
     const shot=active.shots[Math.min(active.shots.length-1,idx+1)];
     if(shot)act.chooseShot(shot.id);
   },'fw-v3-shot-step');
   next.disabled=selected?.id===active.shots.at(-1)?.id;
   sequence.append(prev,rail,next);
   root.append(sequence);
 }
 return root;
}
