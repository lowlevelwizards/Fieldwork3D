/** OC3: Tiny, optional physical intelligence — not objective-location intel.
 * Deterministic initialization, actual observation, timed collection and
 * extraction accountability. No renderer, save or AI owns these records.
 */
import type {Site} from './breach-site.ts';
import type {Pt} from './breach-core.ts';

export type OptionalIntelKind='documents'|'communications'|'digital';
export type OptionalIntelItem={
 id:string;kind:OptionalIntelKind;p:Pt;roomId:string;
 discovered:boolean;collectedBy:string|null;collectedAt:number|null;
};
export type OptionalIntelGather={itemId:string;operatorId:string;elapsed:number};
export type IntelCollector={id:string;side:string;health:number;p:Pt};
type IntelMission={
 optionalIntel:OptionalIntelItem[];
 intelGather?:OptionalIntelGather|null;
 operators:IntelCollector[];scenario:{extract:Pt};
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
export function generateOptionalIntel(site:Site|undefined):OptionalIntelItem[]{
 if(!site||site.training)return [];
 const rooms=site.rooms.filter(r=>r.kind==='room'&&r.w>=35&&r.h>=35);
 const sorted=rooms.map((r,i)=>({
  room:r,rank:mix((site.seed>>>0)^Math.imul(i+17,0x9e3779b9))
 })).sort((a,b)=>a.rank-b.rank||a.room.id.localeCompare(b.room.id));
 const wanted=Math.min(6,Math.max(2,Math.ceil(rooms.length/4)));
 const output:OptionalIntelItem[]=[];
 for(const {room,rank} of sorted){
  if(output.length>=wanted)break;
  const candidates=[
   {x:room.x+room.w*.50,y:room.y+room.h*.50},
   {x:room.x+room.w*.30,y:room.y+room.h*.35},
   {x:room.x+room.w*.70,y:room.y+room.h*.65},
   {x:room.x+room.w*.65,y:room.y+room.h*.30},
   {x:room.x+room.w*.35,y:room.y+room.h*.70}
  ];
  const point=candidates.find(p=>
   Math.hypot(p.x-site.objective.x,p.y-site.objective.y)>22&&
   (site.cover??[]).every(o=>Math.abs(p.x-o.x)>o.w/2+9||
     Math.abs(p.y-o.y)>o.h/2+9));
  if(!point)continue;
  const kind:OptionalIntelKind=(['documents','communications','digital'] as const)[rank%3];
  output.push({id:'side-intel:'+site.seed+':'+room.id,
   kind,p:point,roomId:room.id,discovered:false,
   collectedBy:null,collectedAt:null});
 }
 return output;
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
export function advanceOptionalIntel(s:IntelMission,dt:number,
 clear:(from:Pt,to:Pt)=>boolean):OptionalIntelItem|null{
 // Lost couriers leave a tangible, observed object for another real pickup.
 for(const item of s.optionalIntel){
  if(item.collectedBy===null)continue;
  const carrier=s.operators.find(a=>a.id===item.collectedBy);
  if(!carrier||carrier.health<=0){
   if(carrier)item.p={...carrier.p};
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
 const holders=new Set(s.operators.filter(a=>a.side==='blue'&&a.health>0&&
  near(a.p,s.scenario.extract,37)).map(a=>a.id));
 return s.optionalIntel.filter(i=>i.collectedBy!==null&&holders.has(i.collectedBy));
}
