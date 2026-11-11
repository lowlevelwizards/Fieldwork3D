/** V4 Stage 4 — schematic anatomy driven only by recorded shot evidence.
 * Known-left NEVER paints right, unknown-side NEVER paints both.
 * Orientation mirrors left/right correctly between front and back views.
 * Armor stops are evidence badges, not simulated tissue injuries.
 */
import type {ContactAfterAction,ReportShot} from '../breach-after-action-report.ts';
import {inspectForensicEvidence,type ForensicScope,type ForensicSlot}
 from '../breach-forensic-evidence.ts';
const ns='http://www.w3.org/2000/svg';
const node=(tag:string,attrs:Record<string,string>)=>{
 const e=document.createElementNS(ns,tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);
 return e;
};
const paints=['#efeee8','#ddc77c','#d28c5f','#a74d48'] as const;
function colorFor(shots:readonly ReportShot[]):string{
 const damage=shots.reduce((sum,shot)=>sum+Math.max(0,shot.damage??0),0);
 return paints[damage<=0?0:Math.min(3,Math.ceil(damage))];
}
function box(svg:SVGElement,x:number,y:number,w:number,h:number,
 color:string,part:string,r=3){
 const shape=node('rect',{x:String(x),y:String(y),
  width:String(w),height:String(h),rx:String(r),fill:color,
  stroke:'#677569','stroke-width':'2','data-anatomy-part':part});
 svg.append(shape);return shape;
}
function mark(svg:SVGElement,x:number,y:number,count:number,selected:boolean){
 svg.append(node('circle',{cx:String(x),cy:String(y),r:'10',
  fill:'#4c2525',stroke:'#dfc3ab','stroke-width':'1.4'}));
 const text=node('text',{x:String(x),y:String(y+4),'font-size':'12',
  'text-anchor':'middle','font-weight':'800',fill:'#f2e0ce'});
 text.textContent=count===1?'×':String(count);svg.append(text);
 if(selected)svg.append(node('circle',{
  cx:String(x),cy:String(y),r:'14',fill:'none',
  stroke:'#e6bf82','stroke-width':'2.1',
  'stroke-dasharray':'3 3',class:'fw-v3-paper-pulse'
 }));
}
export function renderHitPaperDoll(
 contact:ContactAfterAction,selectedShotId:number|null,
 back:boolean,scope:ForensicScope='cumulative'
):HTMLElement{
 const outer=document.createElement('div');outer.className='fw-v3-paper';
 const evidence=inspectForensicEvidence(contact,selectedShotId,scope);
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 166 235');
 svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Schematic '+(back?'back':'front')+
  ' anatomy; left and right show only evidenced damaging hits; '+
  'unknown limb side is not painted');
 const shotsFor=(part:ForensicSlot)=>evidence.slots.get(part)??[];
 const currentSlot=evidence.activeShot?.outcome==='damaging'?
   (evidence.activeShot.region==='head'||evidence.activeShot.region==='torso'?
     evidence.activeShot.region:
     evidence.activeShot.anatomy?.side==='left'||
     evidence.activeShot.anatomy?.side==='right'?
     evidence.activeShot.region+'-'+evidence.activeShot.anatomy.side:null):null;
 const visible=(slot:ForensicSlot)=>shotsFor(slot).some(shot=>
   shot.id===evidence.activeShot?.id)&&currentSlot===slot;
 const leftScreenArm:ForensicSlot=back?'arm-left':'arm-right';
 const rightScreenArm:ForensicSlot=back?'arm-right':'arm-left';
 const leftScreenLeg:ForensicSlot=back?'leg-left':'leg-right';
 const rightScreenLeg:ForensicSlot=back?'leg-right':'leg-left';
 box(svg,59,7,48,40,colorFor(shotsFor('head')),'head',7);
 box(svg,69,46,28,9,'#d1c7b0','neck',2);
 box(svg,46,57,74,76,colorFor(shotsFor('torso')),'torso',6);
 box(svg,25,60,22,73,colorFor(shotsFor(leftScreenArm)),leftScreenArm,5);
 box(svg,119,60,22,73,colorFor(shotsFor(rightScreenArm)),rightScreenArm,5);
 box(svg,49,128,68,16,colorFor(shotsFor('torso')),'torso',3);
 box(svg,49,143,32,78,colorFor(shotsFor(leftScreenLeg)),leftScreenLeg,4);
 box(svg,85,143,32,78,colorFor(shotsFor(rightScreenLeg)),rightScreenLeg,4);
 box(svg,46,215,35,10,'#445249','boot',3);
 box(svg,85,215,35,10,'#445249','boot',3);
 // Clothing is a neutral overlay and never re-tints an absent injury.
 if(!back){
   box(svg,58,74,51,42,'#43574b','front-armor',4);
   box(svg,65,80,37,27,'#6c826e','front-vest',2);
 }else{
   box(svg,56,73,56,44,'#516358','back-armor',5);
   box(svg,64,80,40,26,'#758876','back-pack',3);
 }
 const anchors:Record<ForensicSlot,{x:number;y:number}>={
  head:{x:109,y:26},torso:{x:116,y:112},
  [leftScreenArm]:{x:30,y:90},
  [rightScreenArm]:{x:136,y:90},
  [leftScreenLeg]:{x:62,y:182},
  [rightScreenLeg]:{x:103,y:182}
 } as Record<ForensicSlot,{x:number;y:number}>;
 for(const [slot,shots] of evidence.slots){
  if(!shots.length)continue;
  const at=anchors[slot];if(!at)continue;
  mark(svg,at.x,at.y,shots.length,visible(slot));
 }
 const key=document.createElement('p');key.className='fw-v3-paper-key';
 key.textContent=scope==='selected'?'SELECTED SHOT · SCHEMATIC REGION':
   'CUMULATIVE THROUGH SHOT · SCHEMATIC REGION';
 outer.append(svg,key);
 if(evidence.unknownLimb.length){
   const ambiguous=document.createElement('p');
   ambiguous.className='fw-v4-forensic-uncertain';
   ambiguous.setAttribute('data-unknown-limb-count',
     String(evidence.unknownLimb.length));
   const names=[...new Set(evidence.unknownLimb.map(shot=>
     shot.region?.toUpperCase()))].join(' / ');
   ambiguous.textContent=names+' HIT · SIDE UNCERTAIN ('+
     evidence.unknownLimb.length+') · NEITHER LIMB PAINTED';
   outer.append(ambiguous);
 }
 if(evidence.armorStops.length){
   const stops=document.createElement('p');
   stops.className='fw-v4-forensic-armor';
   stops.textContent=evidence.armorStops.length+
     ' ARMOR STOP'+(evidence.armorStops.length===1?'':'S')+
     ' · NO TISSUE WOUND';
   outer.append(stops);
 }
 return outer;
}
