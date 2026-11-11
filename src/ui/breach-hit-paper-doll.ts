/** V3-C: intentionally boxy schematic, same chunky ratios as Fieldwork miniatures.
 * Color is cumulative and REGION-level. Do not fabricate limb side, exact
 * bullet entry, armor layer or trajectory from legacy region-only evidence.
 */
import type {ReportShot,ContactAfterAction} from '../breach-after-action-report.ts';
const ns='http://www.w3.org/2000/svg';
const node=(tag:string,attrs:Record<string,string>)=>{
 const e=document.createElementNS(ns,tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);
 return e;
};
type Region='head'|'torso'|'arm'|'leg';
const regions:readonly Region[]=['head','torso','arm','leg'];
const paints=['#efeee8','#ddc77c','#d28c5f','#a74d48'] as const;
function fillFor(shots:readonly ReportShot[],region:Region):string{
 const damage=shots.filter(s=>s.region===region&&s.outcome==='damaging')
   .reduce((sum,s)=>sum+(s.damage??0),0);
 return paints[damage<=0?0:Math.min(3,Math.ceil(damage))];
}
function box(svg:SVGElement,x:number,y:number,w:number,h:number,color:string,r=3){
 svg.append(node('rect',{x:String(x),y:String(y),width:String(w),height:String(h),
  rx:String(r),fill:color,stroke:'#677569','stroke-width':'2'}));
}
export function renderHitPaperDoll(
 contact:ContactAfterAction,selectedShotId:number|null,back:boolean
):HTMLElement{
 const outer=document.createElement('div');outer.className='fw-v3-paper';
 const shots=contact.shots.slice();
 const index=selectedShotId===null?shots.length:
   shots.findIndex(s=>s.id===selectedShotId)+1;
 const shown=shots.slice(0,Math.max(0,index));
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 166 235');
 svg.setAttribute('role','img');
 svg.setAttribute('aria-label','Chunky schematic '+(back?'rear':'front')+
  ' with cumulative regional injuries; exact bullet positions unavailable');
 const color=(r:Region)=>fillFor(shown,r);
 // Compact head/torso, generous shoulder-to-waist width, short legs.
 box(svg,59,7,48,40,color('head'),7);
 box(svg,69,46,28,9,'#d1c7b0',2);
 box(svg,46,57,74,76,color('torso'),6);
 box(svg,25,60,22,73,color('arm'),5);
 box(svg,119,60,22,73,color('arm'),5);
 box(svg,49,128,68,16,color('torso'),3);
 box(svg,49,143,32,78,color('leg'),4);
 box(svg,85,143,32,78,color('leg'),4);
 box(svg,46,215,35,10,'#445249',3);
 box(svg,85,215,35,10,'#445249',3);
 // Front/back are visual orientation choices, NOT evidence of entry side.
 if(!back){
   box(svg,58,74,51,42,'#43574b',4);
   box(svg,65,80,37,27,'#6c826e',2);
 }else{
   box(svg,56,73,56,44,'#516358',5);
   box(svg,64,80,40,26,'#758876',3);
 }
 // Regional identification circles intentionally cross the local silhouette
 // boundary. A marker is NOT interpreted as a physical impact coordinate.
 const observed=shown.filter(s=>s.outcome!=='miss'&&
   regions.includes(s.region as Region));
 const counts=new Map<Region,number>();
 for(const s of observed)counts.set(s.region as Region,
   (counts.get(s.region as Region)??0)+1);
 const anchors:Record<Region,{x:number;y:number}>={
   head:{x:109,y:26},torso:{x:116,y:110},
   arm:{x:141,y:85},leg:{x:116,y:184}};
 for(const [region,count] of counts){
   const at=anchors[region];
   svg.append(node('circle',{cx:String(at.x),cy:String(at.y),r:'11',
     fill:'#4c2525',stroke:'#dfc3ab','stroke-width':'1.4'}));
   const label=node('text',{x:String(at.x),y:String(at.y+4),
     'font-size':'13','text-anchor':'middle','font-weight':'800',fill:'#f2e0ce'});
   label.textContent=count===1?'×':String(count);svg.append(label);
 }
 const selected=shots.find(s=>s.id===selectedShotId);
 if(selected&&selected.outcome!=='miss'&&regions.includes(selected.region as Region)){
   const at=anchors[selected.region as Region];
   svg.append(node('circle',{cx:String(at.x),cy:String(at.y),
     r:'15',fill:'none',stroke:'#e6bf82','stroke-width':'2.1',
     'stroke-dasharray':'3 3',class:'fw-v3-paper-pulse'}));
 }
 const key=document.createElement('p');
 key.className='fw-v3-paper-key';
 key.textContent='REGIONAL DAMAGE · MARKERS ARE SCHEMATIC';
 outer.append(svg,key);
 return outer;
}
