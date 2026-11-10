/** Fixed schematic post-action paper doll.
 * Red Xs on legacy reports sit on a REGION KEY RAIL, never at fabricated
 * anatomical hit coordinates. Actual physical-hitbox points can be added
 * to a separate overlay when an authoritative source records them.
 */
import type {ReportShot,ContactAfterAction}
 from '../breach-after-action-report.ts';
const NS='http://www.w3.org/2000/svg';
const shape=(tag:string,attrs:Record<string,string>)=>{
 const el=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
 return el;
};
const R=['head','torso','arm','leg'] as const;
type Region=typeof R[number];
const palette=['#f0eee5','#dfd18d','#ca925e','#b54e43'];
const damageOf=(shots:readonly ReportShot[],region:Region)=>{
 const total=shots.filter(s=>s.region===region&&s.outcome==='damaging')
   .reduce((n,s)=>n+(s.damage??0),0);
 return palette[total<=0?0:Math.min(3,Math.ceil(total))];
};
const path=(d:string,fill:string)=>shape('path',{d,fill,stroke:'#63766e',
 'stroke-width':'2','stroke-linejoin':'round'});
export function renderHitPaperDoll(
 contact:ContactAfterAction,selectedShotId:number|null,back:boolean
):HTMLElement{
 const outer=document.createElement('div');
 outer.className='fw-hit-paper';
 const shotIndex=selectedShotId===null?contact.shots.length:
   contact.shots.findIndex(s=>s.id===selectedShotId)+1;
 const visible=contact.shots.slice(0,Math.max(0,shotIndex));
 const svg=shape('svg',{viewBox:'0 0 200 295',role:'img',
  'aria-label':'Schematic '+(back?'rear':'front')+
    ' silhouette, damaged regions and region-only impact annotations'});
 const fill=(region:Region)=>damageOf(visible,region);
 svg.append(
   path('M71 66 L129 66 L143 149 L121 174 L79 174 L57 149 Z',fill('torso')),
   path('M70 67 L57 73 L39 151 L56 157 L77 96 Z',fill('arm')),
   path('M130 67 L143 73 L161 151 L144 157 L123 96 Z',fill('arm')),
   path('M79 172 L102 175 L98 276 L71 276 L66 218 Z',fill('leg')),
   path('M102 175 L121 172 L134 218 L129 276 L102 276 Z',fill('leg')),
   shape('ellipse',{cx:'100',cy:'35',rx:'22',ry:'28',
     fill:fill('head'),stroke:'#63766e','stroke-width':'2'})
 );
 // The rail is outside the silhouette so no one can read a legacy hashed
 // region as an exact impact at a particular shoulder, forearm or side.
 const y:Record<Region,number>={head:38,torso:101,arm:147,leg:226};
 const n:Record<Region,number>={head:0,torso:0,arm:0,leg:0};
 for(const shot of visible){
   if(shot.outcome==='miss'||!R.includes(shot.region as Region))continue;
   const region=shot.region as Region,ordinal=n[region]++;
   const markerX=177-(ordinal%3)*11;
   const markerY=y[region]+Math.floor(ordinal/3)*12;
   const label=shape('text',{x:String(markerX),y:String(markerY),
     'text-anchor':'middle','font-size':'14','font-weight':'800',
     fill:shot.outcome==='armor-stopped'?'#cab78c':'#c64c48'});
   label.textContent=shot.outcome==='armor-stopped'?'◇':'×';
   const title=shape('title',{});
   title.textContent='SHOT '+shot.id+' / '+region.toUpperCase()+
     ' / '+shot.outcome.toUpperCase()+' / REGION ONLY';
   label.append(title);svg.append(label);
   if(shot.id===selectedShotId){
     svg.append(shape('circle',{cx:String(markerX),cy:String(markerY-5),
       r:'10',stroke:'#eddaad',fill:'none','stroke-width':'1.8'}));
   }
 }
 const legend=document.createElement('p');
 legend.className='fw-after-muted';
 legend.textContent='REGION ONLY · schematic impact rail. Location and '+
   'front/back entry are not recorded for these shots. × hit · ◇ armor stopped.';
 outer.append(svg,legend);
 const current=selectedShotId===null?null:
   contact.shots.find(s=>s.id===selectedShotId);
 if(current){
   const selected=document.createElement('strong');
   selected.className='fw-hit-selected';
   selected.textContent='SHOT '+String(shotIndex).padStart(2,'0')+
     ' / '+(current.region?.toUpperCase()??'NO BODY HIT')+
     ' / '+current.outcome.toUpperCase();
   outer.append(selected);
 }
 return outer;
}
