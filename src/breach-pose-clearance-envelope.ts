/** Render-only chest/armor/rig clearance proxies derived from actual
 * fitted garment surfaces. No simulation physics, raycasts or mesh traversal.
 */
import {fittedArmorSurfaces} from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES,RIG_FRONT_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import type {RiflePoint} from './breach-weapon-contact-zones.ts';
export type PoseBox={label:'torso'|'front-armor'|'side-armor'|'chest-rig';
 min:RiflePoint;max:RiflePoint};
export type PoseClearanceEnvelope={armor:string;rig:string;top:string;
 front:number;boxes:readonly PoseBox[]};
const box=(label:PoseBox['label'],min:RiflePoint,max:RiflePoint)=>
 ({label,min,max});
const cache=new Map<string,PoseClearanceEnvelope>();
export function poseClearanceEnvelope(armor:string,rig:string,top:string):
 PoseClearanceEnvelope{
 const key=armor+'|'+rig+'|'+top,hit=cache.get(key);
 if(hit)return hit;
 const a=ARMOR_PROFILES[armor]?armor:'armor-bare';
 const r=RIG_FRONT_PROFILES[rig]?rig:'no-rig';
 const fit=fittedArmorSurfaces(a,top,ARMOR_PROFILES[a]);
 const front=Math.max(5.2,fit.front);
 const boxes:PoseBox[]=[
  box('torso',{x:-5.1,y:-6,z:-5.15},{x:5.45,y:6.3,z:5.15})
 ];
 if(a!=='armor-bare'&&a!=='soft-slick'&&a!=='soft-paca'){
  boxes.push(box('front-armor',
   {x:5,y:fit.frontBagBottom,z:-5},
   {x:front+.24,y:5.3,z:5}));
  const side=Math.max(7.05,fit.side);
  // A shoulder is allowed to articulate above the CUMMERBUND: earlier we
  // filled the whole shoulder-to-waist side with an imaginary armor wall,
  // falsely rejecting every clear support-elbow candidate.
  const proportions=ARMOR_PROPORTIONS[a];
  const half=(proportions?.sideHeight??3)*.5;
  const low=(proportions?.sideY??-1.5)-half-.12;
  const high=(proportions?.sideY??-1.5)+half+.12;
  if(half>.1)for(const sign of [-1,1]){
   boxes.push(box('side-armor',
    {x:-2.6,y:low,z:sign<0?-side:5.2},
    {x:5.6,y:high,z:sign<0?-5.2:side}));
  }
 }
 if(r!=='no-rig'){
  const f=rigContactFrame(a,top,r);
  const visibleFront=Math.max(f.front.x+1.1,
   Math.min(f.front.x+3,(RIG_FRONT_PROFILES[r]?.front??8.5)+f.rigShiftX));
  boxes.push(box('chest-rig',
   {x:f.front.x-.1,y:f.front.y-3.9,z:-4.6},
   {x:visibleFront,y:f.front.y+3.9,z:4.6}));
 }
 const result={armor:a,rig:r,top:fit.top,front,boxes:Object.freeze(boxes)};
 cache.set(key,result);return result;
}
/** Treat each blocky sleeve as a capsule (radius expands the actual box).
 * The proximal upper-arm seam may overlap the shoulder mount; no similar
 * exemption exists for the forearm or center plate.
 */
export function segmentArmorPenetration(a:RiflePoint,b:RiflePoint,
 env:PoseClearanceEnvelope,radius=1.35,skipProximal=0):number{
 let worst=0;
 for(let i=0;i<=18;i++){
  const t=i/18;if(t<skipProximal)continue;
  const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
  for(const volume of env.boxes){
   const {min,max}=volume;
   const depth=Math.min(x-(min.x-radius),(max.x+radius)-x,
    y-(min.y-radius),(max.y+radius)-y,
    z-(min.z-radius),(max.z+radius)-z);
   if(depth>worst)worst=depth;
  }
 }
 return worst;
}
export function armArmorPenetration(shoulder:RiflePoint,elbow:RiflePoint,
 wrist:RiflePoint,env:PoseClearanceEnvelope):number{
 return Math.max(segmentArmorPenetration(shoulder,elbow,env,1.85,.30),
  segmentArmorPenetration(elbow,wrist,env,1.6,0));
}
