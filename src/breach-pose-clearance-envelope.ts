/** Render-only chest/armor/rig clearance proxies derived from actual
 * fitted garment surfaces. No simulation physics, raycasts or mesh traversal.
 */
import * as THREE from 'three';
import {fittedArmorSurfaces} from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES,RIG_FRONT_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import type {RiflePoint} from './breach-weapon-contact-zones.ts';
export type ContactMaterial='rigid'|'structured'|'soft';
export type PoseBox={label:'torso'|'front-armor'|'side-armor'|'chest-rig';
 material:ContactMaterial;min:RiflePoint;max:RiflePoint};
export type PoseClearanceEnvelope={armor:string;rig:string;top:string;
 front:number;boxes:readonly PoseBox[]};
const box=(label:PoseBox['label'],min:RiflePoint,max:RiflePoint,
 material:ContactMaterial='rigid'):PoseBox=>
 ({label,material,min,max});
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
   {x:front+.24,y:5.3,z:5},
   a==='soft-flak'||a==='soft-vest'||a==='plate-legacy'?'soft':'rigid'));
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
    {x:5.6,y:high,z:sign<0?-5.2:side},
    a==='plate-heavy'?'structured':'soft'));
  }
 }
 if(r!=='no-rig'){
  const f=rigContactFrame(a,top,r);
  const visibleFront=Math.max(f.front.x+1.1,
   Math.min(f.front.x+3,(RIG_FRONT_PROFILES[r]?.front??8.5)+f.rigShiftX));
  boxes.push(box('chest-rig',
   {x:f.front.x-.1,y:f.front.y-3.9,z:-4.6},
   {x:visibleFront,y:f.front.y+3.9,z:4.6},'soft'));
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
 return Math.max(segmentArmorPenetration(shoulder,elbow,env,1.85,.52),
  segmentArmorPenetration(elbow,wrist,env,1.6,0));
}

// Stage B: a conservative, actual rectangular sleeve OBB against equipment
// AABBs (15-axis separating-axis test). Broad-phase legacy capsule helpers
// above remain for old callers. The rig's real garments are 3.9 x 4.0 upper,
// 3.4 x 3.5 lower; no global narrowing/hidden sleeve geometry is permitted.
export const LOW_READY_CONTACT_LIMITS={
 rigid:.12,structured:.34,soft:.56,
 /** Extreme compression is capped even in the deep carry archetype. */
 maximumSoftScale:1.65,
 proximalUpperSeam:.16
} as const;
export type SleeveContactResult={
 valid:boolean;hardDepth:number;softDepth:number;quality:number;
 contacts:readonly {label:PoseBox['label'];material:ContactMaterial;
  depth:number;allowed:number}[];
};
const axisX=new THREE.Vector3(1,0,0),
 axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1);
const compareAxes=[axisX,axisY,axisZ];
function sleeveBoxPenetration(
 a:THREE.Vector3,b:THREE.Vector3,width:number,depth:number,
 volume:PoseBox,trimProximal=0):number{
 const from=a.clone().lerp(b,Math.max(0,Math.min(.3,trimProximal)));
 const delta=b.clone().sub(from),length=delta.length();
 if(length<1e-6)return 0;
 const up=delta.clone().divideScalar(length);
 let sideways=axisZ.clone().addScaledVector(up,-axisZ.dot(up));
 if(sideways.lengthSq()<.000001)
  sideways=axisX.clone().addScaledVector(up,-axisX.dot(up));
 sideways.normalize();
 const front=new THREE.Vector3().crossVectors(sideways,up).normalize();
 const sides=[sideways,up,front];
 const extents=[width*.5,length*.5,depth*.5];
 const center=from.clone().add(b).multiplyScalar(.5);
 const volCenter=new THREE.Vector3(
  (volume.min.x+volume.max.x)*.5,
  (volume.min.y+volume.max.y)*.5,
  (volume.min.z+volume.max.z)*.5);
 const volHalf=[(volume.max.x-volume.min.x)*.5,
  (volume.max.y-volume.min.y)*.5,
  (volume.max.z-volume.min.z)*.5];
 const offset=center.sub(volCenter);
 // Face normals and all nine cross axes. A separating axis rejects
 // collision; minimum overlap on the remaining axes estimates depth.
 let minimum=Infinity;
 const consider=(axis:THREE.Vector3)=>{
  const lengthSq=axis.lengthSq();
  if(lengthSq<1e-9)return true;
  const unit=axis.clone().multiplyScalar(1/Math.sqrt(lengthSq));
  const ra=sides.reduce((v,x,i)=>v+Math.abs(x.dot(unit))*extents[i],0);
  const rb=compareAxes.reduce((v,x,i)=>v+Math.abs(x.dot(unit))*volHalf[i],0);
  const overlap=ra+rb-Math.abs(offset.dot(unit));
  if(overlap<=0)return false;
  minimum=Math.min(minimum,overlap);
  return true;
 };
 for(const a of [...compareAxes,...sides])if(!consider(a))return 0;
 for(const a of compareAxes)for(const b of sides){
  const axis=new THREE.Vector3().crossVectors(a,b);
  if(!consider(axis))return 0;
 }
 return Number.isFinite(minimum)?minimum:0;
}
export function evaluateSleeveArmorContact(
 shoulder:THREE.Vector3,elbow:THREE.Vector3,wrist:THREE.Vector3,
 env:PoseClearanceEnvelope,softScale=1):SleeveContactResult{
 const scale=Math.max(1,Math.min(
  LOW_READY_CONTACT_LIMITS.maximumSoftScale,softScale));
 let hardDepth=0,softDepth=0,quality=0,valid=true;
 const contacts:SleeveContactResult['contacts'][number][]=[];
 for(const volume of env.boxes){
  const proximal=LOW_READY_CONTACT_LIMITS.proximalUpperSeam;
  const upper=sleeveBoxPenetration(shoulder,elbow,3.9,4.0,volume,proximal);
  const lower=sleeveBoxPenetration(elbow,wrist,3.4,3.5,volume);
  const depth=Math.max(upper,lower);
  if(depth<=0)continue;
  const baseline=LOW_READY_CONTACT_LIMITS[volume.material];
  const allowed=volume.material==='rigid'?baseline:baseline*scale;
  // The outer sleeve is sewn beneath a thick flak/legacy shoulder-wrap.
  // That proximal UPPER ARM interface is an attachment seam, not an
  // obstacle spanning all the way through the arm. A forearm crossing
  // that side wrap is still checked to the original tight budget.
  const shoulderWrap=volume.label==='side-armor'&&
   (env.armor==='soft-flak'||env.armor==='plate-legacy'||
    env.armor==='soft-vest');
  const upperAllowed=shoulderWrap?Math.max(allowed,2.50):allowed;
  if(volume.material==='rigid')hardDepth=Math.max(hardDepth,depth);
  else softDepth=Math.max(softDepth,depth);
  if(upper>upperAllowed+.001||lower>allowed+.001)valid=false;
  const excess=Math.max(0,upper-upperAllowed*.18)/
   Math.max(.1,upperAllowed)+
   Math.max(0,lower-allowed*.18)/Math.max(.1,allowed);
  quality+=excess*(.5+(volume.material==='rigid'?3:0));
  contacts.push({label:volume.label,material:volume.material,
   depth,allowed:Math.max(allowed,upperAllowed)});
 }
 return {valid,hardDepth,softDepth,quality,contacts};
}
export function evaluateTwoArmClearance(
 shoulders:readonly [THREE.Vector3,THREE.Vector3],
 elbows:readonly [THREE.Vector3,THREE.Vector3],
 wrists:readonly [THREE.Vector3,THREE.Vector3],
 env:PoseClearanceEnvelope,softScale=1){
 const left=evaluateSleeveArmorContact(
  shoulders[0],elbows[0],wrists[0],env,softScale);
 const right=evaluateSleeveArmorContact(
  shoulders[1],elbows[1],wrists[1],env,softScale);
 return {valid:left.valid&&right.valid,
  hardDepth:Math.max(left.hardDepth,right.hardDepth),
  softDepth:Math.max(left.softDepth,right.softDepth),
  quality:left.quality+right.quality,left,right};
}
