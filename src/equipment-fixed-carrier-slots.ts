/** BT4.0–3: explicit physical carrier positions. This is a new contract,
 * intentionally separate from the V1 magazine-equivalent budget until the
 * transactional inventory and renderer adapters are migrated together.
 * Units and axes match the existing operator artwork. */
import {beltContactSegments,beltSurface} from './operator-belt-frame.ts';
import type {BeltStyle} from './operator-belt-profile.ts';
import type {BeltRegion,BeltFootprint} from './operator-belt-mounts.ts';
import {PACK_PROFILES,proposedPackStyle} from './operator-backpack-catalog.ts';
import type {MagazinePouchCell} from './operator-magazine-pouch-fit.ts';
export type Carrier='rig'|'armor'|'belt'|'pocket'|'backpack';
export type CarryKind='sidearm'|'primary-mag'|'secondary-mag'|'shell'|'flash'|'wedge'|'medical'|'trauma'|'radio'|'light'|'tool'|'misc'|'dump'|'cosmetic';
export type Dimensions={width:number;height:number;depth:number};
export type Contact={x:number;y:number;z:number;yaw:number;tilt?:number};
export type WaistSlot={id:string;region:BeltRegion;segment:number;start:number;end:number};
type Span=readonly [number,number];
const waist=(region:BeltRegion,segment:number,range:Span):WaistSlot=>({id:'waist:'+region,region,segment,start:range[0],end:range[1]});
const left=waist('left-hip',6,[-3.25,3.25]),right=waist('right-hip',2,[-3.25,3.25]);
const frontLeft=waist('front-left',0,[-4.98,-1.58]),frontRight=waist('front-right',0,[1.58,4.98]);
const rear2=[waist('rear-right',4,[-5,-.10]),waist('rear-left',4,[.10,5])];
const rear3=[waist('rear-right',4,[-5,-1.80]),waist('rear',4,[-1.60,1.60]),waist('rear-left',4,[1.80,5])];
/** Leather has one reversible position; never two independent hip slots.
 * Historical webbing owns the waist as a whole until its full authored
 * reservation map is supplied; conservative rather than duplicate platforms. */
export function fixedWaistSlots(style:BeltStyle,holsterSide:'left'|'right'='right',historicalWaist=false):WaistSlot[]{
 if(historicalWaist||style==='no-belt')return [];
 if(style==='plain-belt')return [{...(holsterSide==='left'?left:right),id:'waist:leather'}];
 if(style==='duty-belt')return [left,right,...rear2];
 if(style==='battle-belt')return [left,right,...rear3];
 return [frontLeft,frontRight,left,right,...rear3];
}
export type WaistPlacement={ids:string[];region:BeltRegion;segment:number;interval:Span;socket:Contact;
 footprint:Dimensions;corners:readonly (readonly [number,number])[]};
/** Exact fixed position or contiguous span on one face. A large bag claims
 * all underlying positions, including empty space within that span. */
export function fixedWaistCandidates(style:BeltStyle,slots:readonly WaistSlot[],f:Dimensions,allowed:readonly BeltRegion[]):WaistPlacement[]{
 if(style==='no-belt'||![f.width,f.height,f.depth].every(v=>Number.isFinite(v)&&v>0)||f.height>8||f.depth>5)return [];
 const out:WaistPlacement[]=[];
 const segments=beltContactSegments();
 for(const seg of segments){
  const cells=slots.filter(s=>s.segment===seg.index).sort((a,b)=>a.start-b.start);
  for(let i=0;i<cells.length;i++)for(let j=i;j<cells.length;j++){
   const span=cells.slice(i,j+1);
   if(span.some((c,k)=>k>0&&c.start-span[k-1].end>.25))break;
   const start=span[0].start,end=span[span.length-1].end,mid=(start+end)/2;
   if(f.width>end-start+1e-6||start<-seg.length/2+.34||end>seg.length/2-.34)continue;
   // A joined rear span is a rear placement, not an extra independent slot.
   const region=span.length>1&&seg.index===4?'rear':span[0].region;
   if(!allowed.includes(region))continue;
   const contact=beltSurface(style,seg.index,mid);if(!contact)continue;
   const x=contact.x-contact.normalX*.16,z=contact.z-contact.normalZ*.16;
   const side=region==='left-hip'||region==='right-hip';
   const socket={x,y:contact.y+Math.min(2.8,Math.max(1.25,f.height*.43)),z,yaw:contact.yaw,
    tilt:side&&f.height>4?-.04:0};
   // Conservative horizontal projected hull includes clearance for direct
   // contact, tilt and neighboring corner mounts. No scene traversal.
   const tx=Math.cos(seg.yaw),tz=-Math.sin(seg.yaw),half=f.width/2+.09;
   const depth=f.depth+.45;
   const corners=([-half,half] as const).flatMap(t=>([-.12,depth] as const).map(n=>
    [x+tx*t+contact.normalX*n,z+tz*t+contact.normalZ*n] as const));
   // Order vertices cyclically for separating-axis test.
   out.push({ids:span.map(c=>c.id),region,segment:seg.index,interval:[mid-f.width/2,mid+f.width/2],
    socket,footprint:{...f},corners:[corners[0],corners[1],corners[3],corners[2]]});
  }
 }
 return out.sort((a,b)=>a.ids.length-b.ids.length||a.segment-b.segment||a.interval[0]-b.interval[0]);
}
/** SAT across all waist faces, not just same-segment intervals. Touching
 * projected envelopes are permitted; overlap is not. Conservative in Y. */
export function waistPlacementsConflict(a:WaistPlacement,b:WaistPlacement){
 if(a.ids.some(id=>b.ids.includes(id)))return true;
 for(const p of [a.corners,b.corners])for(let i=0;i<p.length;i++){
  const q=p[(i+1)%p.length],nx=q[1]-p[i][1],nz=p[i][0]-q[0];
  const pa=a.corners.map(v=>v[0]*nx+v[1]*nz),pb=b.corners.map(v=>v[0]*nx+v[1]*nz);
  if(Math.max(...pa)<=Math.min(...pb)+1e-7||Math.max(...pb)<=Math.min(...pa)+1e-7)return false;
 }
 return true;
}
export type StorageSlot={id:string;carrier:Exclude<Carrier,'belt'>;accepts:readonly CarryKind[];
 dimensions:Dimensions;concealed:boolean;dedicated?:boolean;cell?:MagazinePouchCell;
 /** Optional physical occupancy keys shared by armor and rig positions. */
 conflicts?:readonly string[]};
const pocketKinds:readonly CarryKind[]=['primary-mag','secondary-mag','shell','wedge','light','misc','medical'];
const packKinds:readonly CarryKind[]=['primary-mag','secondary-mag','shell','flash','wedge','medical','trauma','radio','light','tool','misc'];
export function clothingStorage(trousers:string,legsItem:string):StorageSlot[]{
 if(legsItem==='legs-none')return [];
 const count=['bdu-trousers','acu-trousers','gorka-trousers','civilian-cargo'].includes(trousers)?2:
  ['jeans','track-pants'].includes(trousers)?1:0;
 return Array.from({length:count},(_,i)=>({id:'pocket:'+i,carrier:'pocket',accepts:pocketKinds,
  dimensions:count===2?{width:5.5,height:7,depth:3}:{width:3.5,height:5,depth:2},concealed:true}));
}
export function packStorage(style:string,compatible=true):StorageSlot[]{
 const key=proposedPackStyle(style);if(!key||!compatible)return [];
 const p=PACK_PROFILES[key];if(p.harness==='direct'&&!compatible)return [];
 return Array.from({length:p.capacity},(_,i)=>({id:'pack:'+i,carrier:'backpack',
  accepts:packKinds,dimensions:{width:p.size[2],height:p.size[1],depth:p.size[0]},concealed:true}));
}
/** Existing authored cells, including real depth lanes, are the source of
 * dedicated magazine positions. No made-up numeric chest capacity. */
export function registeredRigStorage(cells:readonly MagazinePouchCell[],carrier:'rig'|'armor'='rig'):StorageSlot[]{
 const seen=new Set<string>(),out:StorageSlot[]=[];
 for(const c of cells){
  const lane=c.slots?.[c.slot??0]??0;
  const key=[c.x,c.y,c.z,c.yaw??0,lane].join(':');
  if(seen.has(key))continue;seen.add(key);
  // Lane space is bounded by halfway to the adjacent lane, not by the
  // whole pouch depth for each separate magazine.
  const lanes=c.slots??[0];
  const nearest=Math.min(...lanes.filter(v=>v!==lane).map(v=>Math.abs(v-lane)),Infinity);
  const depth=Math.min(c.depth-.12,nearest);
  if(depth<=0||c.width<=.12||c.height<=0)continue;
  out.push({id:carrier+':mag:'+key,carrier,accepts:['primary-mag'],dedicated:true,concealed:false,
   dimensions:{width:c.width-.12,height:c.height+1.1,depth},cell:{...c}});
 }
 return out;
}
export function dimensionsFit(item:Dimensions,slot:Dimensions){
 return [item.width,item.height,item.depth].every(v=>Number.isFinite(v)&&v>0)&&
  item.width<=slot.width+1e-6&&item.height<=slot.height+1e-6&&item.depth<=slot.depth+1e-6;
}
