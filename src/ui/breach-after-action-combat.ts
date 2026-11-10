/** Forensic contact browser: complete historical ledgers, not simulated kills.
 * Defaults to a lightweight 2D regional silhouette; no 3D initialized here.
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
const node=(tag:string,cls='',text?:string)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=text;
 return el;
};
const btn=(text:string,click:()=>void,cls='fw-after-link')=>{
 const b=document.createElement('button');b.type='button';b.textContent=text;
 b.className=cls;b.addEventListener('click',click);return b;
};
const stamp=(t:number)=>Math.floor(t/60)+':'+
 String(Math.floor(t%60)).padStart(2,'0')+'.'+
 String(Math.floor(t%1*10));
const shown=(s:string|null)=>s??'NOT RECORDED';
const outcome=(s:ReportShot)=>s.down?'FINAL INCAPACITATING HIT':
 s.outcome==='armor-stopped'?'ARMOR STOP':
 s.outcome==='damaging'?'WOUND':s.outcome==='miss'?'MISS':'HIT / UNKNOWN DAMAGE';
export function renderCombatReport(
 report:AfterActionReport,view:View,act:Actions
):HTMLElement{
 const root=node('section','fw-after-section');
 const nav=node('div','fw-after-combat-switch');
 for(const side of ['red','blue'] as const){
   const b=btn(side==='red'?'HOSTILES':'SQUAD CASUALTIES',
     ()=>act.chooseSide(side),'fw-after-link');
   b.setAttribute('aria-pressed',String(view.side===side));
   nav.append(b);
 }
 root.append(node('h2','fw-after-heading','COMBAT RECORD'),nav);
 const contacts=view.side==='red'?report.hostiles:report.friendlyCasualties;
 if(!view.selectedContact){
   const list=node('div','fw-after-rank-list');
   for(const c of contacts){
     const label=c.name+' · '+c.resolution.toUpperCase();
     const b=btn(label,()=>act.chooseContact(c.id),'fw-after-person');
     b.append(node('small','',c.shots.length+' SHOTS DIRECTED AT TARGET'+
       (c.resolvedAt===null?'':' · '+stamp(c.resolvedAt))));
     list.append(b);
   }
   root.append(list);
   if(!contacts.length)root.append(node('p','fw-after-empty',
     view.side==='blue'?'NO RECORDED SQUAD INCAPACITATIONS.':
       'NO RECORDED HOSTILE CONTACTS.'));
   return root;
 }
 const contact=contacts.find(c=>c.id===view.selectedContact);
 if(!contact){root.append(btn('‹ ALL CONTACTS',()=>act.chooseContact(null)));return root;}
 root.append(btn('‹ ALL CONTACTS',()=>act.chooseContact(null)));
 root.append(node('h2','fw-after-heading',
   contact.name+' / '+contact.resolution.toUpperCase()),
   node('p','fw-after-muted',
     'FULL RECONSTRUCTION · '+(contact.resolvedAt===null?
       'OUTCOME UNRESOLVED':stamp(contact.resolvedAt))+
     ' · '+contact.shots.length+' RECORDED TARGETED SHOTS'));
 const holder=node('div','fw-after-combat-split');
 const left=node('div','fw-after-panel');
 const modeButtons=node('div','fw-after-combat-switch');
 for(const mode of ['paper','3d'] as const){
   const b=btn(mode==='paper'?'2D PAPER DOLL':'3D MODEL',
     ()=>act.chooseMode(mode),'fw-after-link');
   b.setAttribute('aria-pressed',String(view.inspectionMode===mode));
   modeButtons.append(b);
 }
 left.append(modeButtons);
 const toggle=node('div','fw-after-combat-switch');
 for(const back of [false,true]){
   const b=btn(back?'BACK':'FRONT',()=>act.chooseView(back),'fw-after-link');
   b.setAttribute('aria-pressed',String(view.back===back));toggle.append(b);
 }
 if(view.inspectionMode==='paper')
   left.append(toggle,renderHitPaperDoll(contact,view.selectedShotId,view.back));
 else{
   const model=node('div','fw-after-model');
   model.dataset.afterModel=contact.id;
   model.textContent='LOADING HISTORICAL CHARACTER RIG…';
   left.append(model,node('p','fw-after-muted',
     'ROTATE TO INSPECT THE HISTORICAL UNIFORM AND EQUIPMENT. '+
     'EXACT ANATOMICAL MARKERS ARE NOT RECORDED FOR THESE SHOTS.'));
 }
 if(contact.shots.length){
   const selected=contact.shots.find(s=>s.id===view.selectedShotId)??null;
   left.append(btn('VIEW REPLAY · LOOPED BODYCAM',()=>act.viewReplay(contact,selected)));
 }
 holder.append(left);
 const list=node('div','fw-after-shot-list');
 list.append(node('p','fw-after-caption','SHOTS / RECORDED ORDER'));
 if(!contact.shots.length)list.append(node('p','fw-after-empty',
    'No shots recorded against this contact. Resolution is based on events.'));
 for(const [i,s] of contact.shots.entries()){
   const item=document.createElement('button');
   item.type='button';item.className='fw-after-shot';
   item.dataset.selected=String(s.id===view.selectedShotId);
   item.append(node('b','',String(i+1).padStart(2,'0')+' · '+stamp(s.at)),
     node('span','',s.shooterId.toUpperCase()+
       ' · '+shown(s.receiver??s.weapon)+
       (s.caliber?' · '+s.caliber+' (NOMINAL)':'')),
     node('small','',outcome(s)+' · '+(s.region??'NO REGION').toUpperCase()+
       (s.damage===null?'':' · DAMAGE '+s.damage)));
   item.addEventListener('click',()=>act.chooseShot(s.id));list.append(item);
 }
 holder.append(list);root.append(holder);
 if(contact.finalShotId===null&&contact.resolution==='surrendered')
   root.append(node('p','fw-after-muted',
     'This contact surrendered. No incapacitating finishing shot is recorded.'));
 return root;
}
