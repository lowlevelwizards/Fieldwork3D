/** OC3: Tiny, optional physical intelligence — not objective-location intel.
 * Deterministic initialization, actual observation, timed collection and
 * extraction accountability. No renderer, save or AI owns these records.
 */
import type {Site} from './breach-site.ts';
import {pointToSegment,type Pt,type Obstacle} from './breach-core.ts';
import {visibleSurfaceHeight} from './worldgen/decoration-anchors.ts';

export type OptionalIntelKind='documents'|'communications'|'digital';
export type OptionalIntelModel='folder'|'papers'|'laptop'|'flash-drive'|'phone'|'notebook';
export type OptionalIntelItem={
 id:string;kind:OptionalIntelKind;p:Pt;roomId:string;
 /** p is the accessible contact/observation anchor, surface is the visual prop. */
 model?:OptionalIntelModel;surface?:{p:Pt;height:number;yaw:number;fixture:string;supportIndex?:number;supportOrigin?:Pt};
 discovered:boolean;collectedBy:string|null;collectedAt:number|null;
};
export type OptionalIntelGather={itemId:string;operatorId:string;elapsed:number};
export type IntelCollector={id:string;side:string;health:number;p:Pt};
type IntelMission={
 optionalIntel:OptionalIntelItem[];
 intelGather?:OptionalIntelGather|null;
 operators:IntelCollector[];
 /** Already exited couriers still own the evidence they physically carried. */
 extractedOperators?:IntelCollector[];
 scenario:{extract:Pt};
 phase:string;seconds:number;
};

const near=(a:Pt,b:Pt,r:number)=>
 Math.hypot(a.x-b.x,a.y-b.y)<=r;
function mix(seed:number):number{
 let n=seed>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);
 n=Math.imul(n^(n>>>15),0x846ca68b);
 return (n^(n>>>16))>>>0;
}
const surfaceModels:Record<string,readonly OptionalIntelModel[]>={
 desk:['folder','papers','laptop','flash-drive','notebook'],
 'meeting-table':['folder','papers','laptop','notebook'],
 'workbench':['papers','flash-drive','notebook'],
 'dining-table':['papers','laptop','phone','notebook'],
 'coffee-table':['papers','phone','notebook'],
 nightstand:['phone','notebook','flash-drive'],
 'side-table':['phone','notebook'],
 dresser:['folder','phone','notebook'],
 'filing-cabinet':['folder','papers'],
 counter:['papers','phone','notebook'],
 'checkout':['papers','phone'],
};
const preferredRooms=new Set(['office','study','cubicles','meeting','control',
 'reception','staff','workshop','storage','stockroom','packing']);
const modelKind=(model:OptionalIntelModel):OptionalIntelKind=>
 model==='laptop'||model==='flash-drive'?'digital':model==='phone'?'communications':'documents';
function generateEvidence(site:Site|undefined,primary=false,reservedRoomId?:string):OptionalIntelItem[]{
 if(!site||site.training)return [];
 const rooms=site.rooms.filter(r=>r.kind==='room'&&r.w>=35&&r.h>=35&&
   (primary?site.objective.x>=r.x&&site.objective.x<=r.x+r.w&&
     site.objective.y>=r.y&&site.objective.y<=r.y+r.h:r.id!==reservedRoomId));
 const cover=site.cover??[];
 const inside=(p:Pt,r:typeof rooms[number],pad=9)=>p.x>=r.x+pad&&
   p.x<=r.x+r.w-pad&&p.y>=r.y+pad&&p.y<=r.y+r.h-pad;
 const clear=(p:Pt)=>cover.every(o=>Math.abs(p.x-o.x)>o.w/2+8||
   Math.abs(p.y-o.y)>o.h/2+8)&&
   (site.walls??[]).every(w=>pointToSegment(p,w)>9);
 const sorted=rooms.map((room,i)=>({room,
   rank:mix((site.seed>>>0)^Math.imul(i+17,0x9e3779b9))}))
  .sort((a,b)=>Number(preferredRooms.has(b.room.purpose??''))-
    Number(preferredRooms.has(a.room.purpose??''))||
    a.rank-b.rank||a.room.id.localeCompare(b.room.id));
 const wanted=primary?1:Math.min(6,Math.max(2,Math.ceil(rooms.length/4)));
 const output:OptionalIntelItem[]=[];
 for(const {room,rank} of sorted){
  if(output.length>=wanted)break;
  const supports=cover.filter(o=>o.fixture&&surfaceModels[o.fixture]&&
    inside(o,room,0)&&o.w>=15&&o.h>=15&&
    (primary||Math.hypot(o.x-site.objective.x,o.y-site.objective.y)>22));
  for(const o of supports){
   const candidates=[
    {x:o.x+o.w/2+10,y:o.y,dx:1,dy:0},
    {x:o.x-o.w/2-10,y:o.y,dx:-1,dy:0},
    {x:o.x,y:o.y+o.h/2+10,dx:0,dy:1},
    {x:o.x,y:o.y-o.h/2-10,dx:0,dy:-1}
   ];
   const spot=candidates.find(v=>inside(v,room)&&clear(v)&&
     (primary||Math.hypot(v.x-site.objective.x,v.y-site.objective.y)>22));
   if(!spot)continue;
   const fixture=o.fixture!;
   const models=surfaceModels[fixture].filter(m=>m!=='laptop'||Math.min(o.w,o.h)>=23);
   const model=models[rank%models.length];
   const half=model==='laptop'||model==='folder'||model==='papers'?7:4;
   const px=o.x+spot.dx*Math.max(0,o.w/2-half-2);
   const py=o.y+spot.dy*Math.max(0,o.h/2-half-2);
   const visual={x:px,y:py};
   if((site.dressing??[]).some(d=>d.placement==='surface'&&
     Math.hypot(d.x-px,d.y-py)<half+7))continue;
   if(cover.some(other=>other!==o&&Math.abs(px-other.x)<other.w/2+half&&
     Math.abs(py-other.y)<other.h/2+half))continue;
   output.push({id:(primary?'primary-intel:':'side-intel:')+site.seed+':'+room.id,kind:modelKind(model),
    model,p:{x:spot.x,y:spot.y},roomId:room.id,
    surface:{p:visual,height:visibleSurfaceHeight(fixture),
     yaw:Math.atan2(spot.dx,spot.dy),fixture,supportIndex:cover.indexOf(o),supportOrigin:{x:o.x,y:o.y}},
    discovered:false,collectedBy:null,collectedAt:null});
   break;
  }
 }
 // Only furniture-free legacy/training fixtures use the old floor placement.
 // Real furnished sites prefer fewer justified items to arbitrary floor loot.
 if(!primary&&!cover.length)for(const {room,rank} of sorted){
  if(output.length>=wanted)break;
  const p={x:room.x+room.w*.5,y:room.y+room.h*.5};
  if(Math.hypot(p.x-site.objective.x,p.y-site.objective.y)<=22||!clear(p))continue;
  const model:OptionalIntelModel=(['folder','phone','flash-drive'] as const)[rank%3];
  output.push({id:'side-intel:'+site.seed+':'+room.id,kind:modelKind(model),
    model,p,roomId:room.id,discovered:false,collectedBy:null,collectedAt:null});
 }
 return output;
}
/** Primary and optional evidence share the same bounded generation rules.
 * Only the primary item can occupy its authored objective room's reserved surface. */
export function generateOptionalIntel(site:Site|undefined,reservedRoomId?:string):OptionalIntelItem[]{
 return generateEvidence(site,false,reservedRoomId);
}
export function generatePrimaryIntel(site:Site|undefined):OptionalIntelItem|undefined{
 if(!site||site.training)return undefined;
 const placed=generateEvidence(site,true)[0];
 return placed??{id:'primary-intel:'+site.seed,kind:'documents',model:'folder',
   p:{...site.objective},roomId:site.rooms.find(r=>site.objective.x>=r.x&&
    site.objective.x<=r.x+r.w&&site.objective.y>=r.y&&site.objective.y<=r.y+r.h)?.id??'',
   discovered:false,collectedBy:null,collectedAt:null};
}
/** Move the visual and reachable contact together with the same mutable fixture.
 * Stable cover indices are preserved by the existing physical-prop owner. */
export function updateEvidenceSupport(item:OptionalIntelItem,cover:readonly Obstacle[]):boolean{
 const surface=item.surface;
 if(item.collectedBy!==null||!surface||surface.supportIndex===undefined||!surface.supportOrigin)return false;
 const o=cover[surface.supportIndex];
 if(!o||o.fixture!==surface.fixture||o.destroyed||o.toppled){
  delete item.surface;return true;
 }
 const dx=o.x-surface.supportOrigin.x,dy=o.y-surface.supportOrigin.y;
 if(Math.abs(dx)+Math.abs(dy)<.00001)return false;
 item.p={x:item.p.x+dx,y:item.p.y+dy};
 item.surface={...surface,p:{x:surface.p.x+dx,y:surface.p.y+dy},
  supportOrigin:{x:o.x,y:o.y}};
 return true;
}
/** Observation belongs to the real squad cone, even with full map enabled. */
export function observeOptionalIntel(items:OptionalIntelItem[],
 visible:(p:Pt)=>boolean):number{
 let gained=0;
 for(const item of items)if(!item.discovered&&
   item.collectedBy===null&&visible(item.p)){
  item.discovered=true;gained++;
 }
 return gained;
}
export function eligibleOptionalIntel(s:IntelMission,
 operatorId:string,clear:(from:Pt,to:Pt)=>boolean):OptionalIntelItem|null{
 const actor=s.operators.find(a=>a.id===operatorId&&a.side==='blue'&&a.health>0);
 if(!actor)return null;
 return s.optionalIntel.find(item=>item.discovered&&
   item.collectedBy===null&&near(actor.p,item.p,23)&&
   clear(actor.p,item.p))??null;
}
/** Plan or live command. Interaction is completed only by the fixed tick. */
export function beginOptionalIntelGather(s:IntelMission,operatorId:string,
 clear:(from:Pt,to:Pt)=>boolean):boolean{
 if(s.phase!=='running'&&s.phase!=='planning')return false;
 if(s.intelGather)return false;
 const item=eligibleOptionalIntel(s,operatorId,clear);
 if(!item)return false;
 s.intelGather={itemId:item.id,operatorId,elapsed:0};
 return true;
}
/** Timed pickup starts automatically on observed, physically reachable
 * evidence. Courier ownership and interruption still belong to the tick. */
export function autoBeginOptionalIntelGather(s:IntelMission,
 clear:(from:Pt,to:Pt)=>boolean):boolean{
 if(s.intelGather||s.phase!=='running')return false;
 for(const actor of s.operators)
  if(actor.side==='blue'&&actor.health>0&&
     beginOptionalIntelGather(s,actor.id,clear))return true;
 return false;
}
/** Ordinary discovered evidence is a walk-over pickup. No hidden timer or
 * stop order: the existing mission tick grants custody once a living blue
 * operator physically reaches a clear contact lane. One pickup per tick
 * keeps event ordering deterministic and avoids duplicate collectors.
 */
export function collectProximityOptionalIntel(s:IntelMission,
 clear:(from:Pt,to:Pt)=>boolean):OptionalIntelItem|null{
 if(s.phase!=='running')return null;
 for(const actor of s.operators){
  if(actor.side!=='blue'||actor.health<=0)continue;
  for(const item of s.optionalIntel){
   if(!item.discovered||item.collectedBy!==null||
      !near(actor.p,item.p,31)||!clear(actor.p,item.p))continue;
   item.collectedBy=actor.id;
   item.collectedAt=s.seconds;
   if(s.intelGather?.itemId===item.id)s.intelGather=null;
   return item;
  }
 }
 return null;
}
export function advanceOptionalIntel(s:IntelMission,dt:number,
 clear:(from:Pt,to:Pt)=>boolean):OptionalIntelItem|null{
 // Lost couriers leave a tangible, observed object for another real pickup.
 for(const item of s.optionalIntel){
  if(item.collectedBy===null)continue;
  const carrier=s.operators.find(a=>a.id===item.collectedBy)??
    s.extractedOperators?.find(a=>a.id===item.collectedBy);
  if(!carrier||carrier.health<=0){
   if(carrier)item.p={...carrier.p};
   delete item.surface;
   item.collectedBy=null;
  }
 }
 const action=s.intelGather;
 if(!action)return null;
 const item=s.optionalIntel.find(i=>i.id===action.itemId);
 const actor=s.operators.find(a=>a.id===action.operatorId&&a.side==='blue');
 if(!item||!actor||actor.health<=0||item.collectedBy!==null||
    !near(actor.p,item.p,23)||!clear(actor.p,item.p)){
  s.intelGather=null;return null;
 }
 action.elapsed+=Math.max(0,dt);
 if(action.elapsed<1.2)return null;
 item.collectedBy=actor.id;
 item.collectedAt=s.seconds;
 s.intelGather=null;
 return item;
}
/** No remote rewards: only evidence carried by a mobile extracted operator. */
export function optionalIntelRecovered(s:IntelMission):OptionalIntelItem[]{
 const holders=new Set([
   ...s.operators.filter(a=>a.side==='blue'&&a.health>0&&
     near(a.p,s.scenario.extract,37)),
   ...(s.extractedOperators??[]).filter(a=>a.side==='blue'&&a.health>0)
  ].map(a=>a.id));
 return s.optionalIntel.filter(i=>i.collectedBy!==null&&holders.has(i.collectedBy));
}

/** EB18: only the extraction-accountable item IDs can enter the archive.
 * A receipt is evidence type, not an omniscient identity or location dump. */
export type RecoveredIntelReceipt={id:string;kind:OptionalIntelKind;model?:OptionalIntelModel};
export function validRecoveredIntelReceipt(raw:unknown):raw is RecoveredIntelReceipt{
 if(!raw||typeof raw!=='object')return false;
 const r=raw as RecoveredIntelReceipt;
 return typeof r.id==='string'&&r.id.length>0&&r.id.length<=200&&
  ['documents','communications','digital'].includes(r.kind)&&
  (r.model===undefined||['folder','papers','laptop','flash-drive','phone','notebook'].includes(r.model));
}
export function recoveredIntelReceipts(items:readonly OptionalIntelItem[],recoveredIds:readonly string[]):RecoveredIntelReceipt[]{
 const ids=new Set(recoveredIds),seen=new Set<string>(),out:RecoveredIntelReceipt[]=[];
 for(const item of items){
  if(!ids.has(item.id)||item.collectedBy===null||item.collectedAt===null||seen.has(item.id))continue;
  const receipt={id:item.id,kind:item.kind,model:item.model};
  if(!validRecoveredIntelReceipt(receipt))continue;
  seen.add(item.id);out.push(receipt);
  if(out.length>=6)break;
 }
 return out;
}

export function recoveredEvidenceSummary(items:readonly RecoveredIntelReceipt[]):string{
 const groups=new Map<string,number>();
 for(const item of items){
  const label=(item.model??item.kind).replaceAll('-',' ');
  groups.set(label,(groups.get(label)??0)+1);
 }
 return [...groups].map(([label,n])=>n+' × '+label).join(' · ');
}
