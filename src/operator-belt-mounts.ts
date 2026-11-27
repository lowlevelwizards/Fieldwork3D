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
 'front-left':{segment:0,offset:-3.35,width:3.4},
 'front-right':{segment:0,offset:3.35,width:3.4},
 'left-hip':{segment:6,offset:-.35,width:6.5},
 'right-hip':{segment:2,offset:.35,width:6.5},
 // All rear regions share the back span and explicitly reserve intervals.
 'rear-right':{segment:4,offset:-3.35,width:3.4},
 'rear-left':{segment:4,offset:3.35,width:3.4},
 rear:{segment:4,offset:0,width:8.4}
};
export type BeltFootprint={width:number;height:number;depth:number;spaces:number};
export type BeltMountRequest={id:string;footprint:BeltFootprint;
 preferred?:BeltRegion;allowed?:readonly BeltRegion[]};
export type BeltMount={id:string;region:BeltRegion;segment:number;
 interval:readonly [number,number];socket:NonNullable<ReturnType<typeof beltSurface>>&{tilt?:number};
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
  if(f.height>8||f.depth>5){reject('no-fit');continue;}
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
   // Direct contact, never a lateral stand-off. Raise the body around
   // the waist and use a subtle outward lean only for deep hip holders.
   const side=region==='left-hip'||region==='right-hip';
   const socket=contact?{...contact,
    x:contact.x-contact.normalX*.16,z:contact.z-contact.normalZ*.16,
    y:contact.y+Math.min(2.8,Math.max(1.25,f.height*.43)),
    tilt:side&&f.height>4?-.04:0}:null;
   if(!socket)continue;
   chosen={id,region,segment:spec.segment,interval,socket,footprint:{...f}};break;
  }
  if(!chosen){reject('no-fit');continue;}
  mounts.push(chosen);used+=f.spaces;
 }
 return {mounts,rejected,used,capacity};
}
