/** Predictive *presentation only* for a known hinged leaf.
 * The caller must supply ONLY currently disclosed people. Unknown contacts
 * cannot influence the preview, or the arc becomes an inadvertent radar.
 * The motor in breach-door.ts remains the sole collision authority.
 */
import {doorLeafSegment,pointToSegment,OPERATOR_RADIUS,
 type Door,type Pt} from './breach-core.ts';
import {doorWouldStrikeActors} from './breach-door.ts';

export type DoorSwingTone='clear'|'near'|'restricted'|'blocked';
export type DoorSwingPreview={tone:DoorSwingTone;reachable:number;contact:number|null};

export function previewKnownDoorSwing(door:Door,people:readonly Pt[]):DoorSwingPreview{
 const current=Math.max(0,Math.min(1,door.openFraction??(door.open?1:0)));
 const clear:DoorSwingPreview={tone:'clear',reachable:1,contact:null};
 if(door.kind==='sliding'||door.kind==='shutter'||current>=.99||!people.length)
   return clear;
 const hinge=door.hinge==='b'?door.b:door.a;
 const reach=Math.hypot(door.b.x-door.a.x,door.b.y-door.a.y);
 const candidates=people.filter(p=>Math.hypot(p.x-hinge.x,p.y-hinge.y)<
   reach+OPERATOR_RADIUS+11);
 if(!candidates.length)return clear;
 const origin=doorLeafSegment(door);
 let nearest=Infinity,firstContact:number|null=null;
 // Bounded sampling is only for presentation; confirm every potential hit
 // against the exact swept-panel test used by the authoritative hinge motor.
 for(let i=1;i<=24;i++){
   const fraction=current+(1-current)*i/24;
   const leaf=doorLeafSegment({...door,openFraction:fraction});
   for(const p of candidates){
     const gap=pointToSegment(p,leaf);
     nearest=Math.min(nearest,gap);
     if(gap>=OPERATOR_RADIUS+1||
       gap>=pointToSegment(p,origin)-.01)continue;
     if(doorWouldStrikeActors(door,fraction,[p])){
       firstContact=fraction;break;
     }
   }
   if(firstContact!==null)break;
 }
 if(firstContact!==null){
   const reachable=Math.max(current,firstContact-(1-current)/24);
   return {tone:reachable<.46?'blocked':'restricted',
     reachable,contact:firstContact};
 }
 return nearest<OPERATOR_RADIUS+10?
   {tone:'near',reachable:1,contact:null}:clear;
}
