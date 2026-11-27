import {LEG_HIP_SIDE} from './breach-leg-geometry.ts';
/** BT2: deterministic waist reservation. Pure presentation/fit contract;
 * no inventory, capacity grant, reload or gameplay mutation.
 * +X front, +Z right, all units pelvis-local. Named regions avoid the buckle
 * and stay clear of corner transitions. Large cross-region items are deferred
 * to the full physical equipment integration.
 */
import {BELT_PROFILES,type BeltStyle} from './operator-belt-profile.ts';
import {beltContactSegments,beltSurface} from './operator-belt-frame.ts';
export const BELT_REGIONS=['front-left','front-right','left-hip','right-hip','rear-left','rear-right','rear'] as const;
export type BeltRegion=typeof BELT_REGIONS[number];
type RegionSpec={segment:number;offset:number;width:number};
const REGIONS:Record<BeltRegion,RegionSpec>={
 'front-left':{segment:0,offset:-3.35,width:3.25},
 'front-right':{segment:0,offset:3.35,width:3.25},
 'left-hip':{segment:6,offset:.25,width:6.5},
 'right-hip':{segment:2,offset:-.25,width:6.5},
 // All rear regions share the back span and explicitly reserve intervals.
 'rear-right':{segment:4,offset:-3.35,width:3.25},
 'rear-left':{segment:4,offset:3.35,width:3.25},
 rear:{segment:4,offset:0,width:3.5}
};
export type BeltFootprint={width:number;height:number;depth:number;spaces:number};
export type BeltMountRequest={id:string;footprint:BeltFootprint;
 preferred?:BeltRegion;allowed?:readonly BeltRegion[]};
export type BeltMount={id:string;region:BeltRegion;segment:number;
 interval:readonly [number,number];socket:NonNullable<ReturnType<typeof beltSurface>>&{clearance?:number};
 footprint:BeltFootprint};
export type BeltMountRejection={id:string;reason:'no-belt'|'duplicate'|'invalid-footprint'|'capacity'|'no-fit'};
export function resolveBeltMounts(style:BeltStyle,requests:readonly BeltMountRequest[]){
 const mounts:BeltMount[]=[],rejected:BeltMountRejection[]=[];
 const seen=new Set<string>();let used=0;
 const capacity=BELT_PROFILES[style].capacity;
 for(const request of requests){
  const {id,footprint:f}=request;
  const reject=(reason:BeltMountRejection['reason'])=>rejected.push({id,reason});
  if(seen.has(id)){reject('duplicate');continue;}
  seen.add(id);
  if(style==='no-belt'){reject('no-belt');continue;}
  if(!id||![f.width,f.height,f.depth,f.spaces].every(Number.isFinite)||
   f.width<=0||f.height<=0||f.depth<=0||f.spaces<0||!Number.isInteger(f.spaces)){
   reject('invalid-footprint');continue;
  }
  if(used+f.spaces>capacity){reject('capacity');continue;}
  // Conservative envelope: no long hanging equipment on the waist in BT2.
  if(f.height>6||f.depth>4){reject('no-fit');continue;}
  const order=request.preferred?[request.preferred,...BELT_REGIONS.filter(r=>r!==request.preferred)]:BELT_REGIONS;
  let chosen:BeltMount|undefined;
  for(const region of order){
   if(request.allowed&&!request.allowed.includes(region))continue;
   const spec=REGIONS[region];
   const width=spec.width-(style==='plain-belt'?.5:0);
   if(f.width>width)continue;
   const interval=[spec.offset-f.width/2,spec.offset+f.width/2] as const;
   const seg=beltContactSegments()[spec.segment];
   if(interval[0]<-seg.length/2+.35||interval[1]>seg.length/2-.35)continue;
   if(mounts.some(m=>m.segment===spec.segment&&interval[0]<m.interval[1]+.18&&interval[1]>m.interval[0]-.18))continue;
   const contact=beltSurface(style,spec.segment,spec.offset);
   // Standing conservative trouser envelope: the hip joint is 4.8 units
   // outboard, the broad classic field thigh roughly 3.45 units, its
   // pocket approximately 1.19 units. Allow a small margin on long hip
   // attachments, instead of sinking their shell into the cargo pocket.
   const side=region==='left-hip'||region==='right-hip';
   const pocketEnvelope=LEG_HIP_SIDE+3.45+1.19;
   const clearance=side&&contact&&f.height>3?
    Math.max(0,pocketEnvelope+.12-Math.abs(contact.z)-f.depth*.16):0;
   const socket=contact?{...contact,y:contact.y+Math.min(1.5,BELT_PROFILES[style].height*.45+.35),
    clearance}:null;
   if(!socket)continue;
   chosen={id,region,segment:spec.segment,interval,socket,footprint:{...f}};break;
  }
  if(!chosen){reject('no-fit');continue;}
  mounts.push(chosen);used+=f.spaces;
 }
 return {mounts,rejected,used,capacity};
}
