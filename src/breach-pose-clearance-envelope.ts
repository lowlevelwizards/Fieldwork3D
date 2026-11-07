/** Render-only chest/armor/rig clearance proxies derived from actual
 * fitted garment surfaces. No simulation physics, raycasts or mesh traversal.
 */
import * as THREE from 'three';
import {fittedArmorSurfaces} from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES,RIG_FRONT_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import {armorSideLayout} from './operator-armor-side-layout.ts';
import {LOW_READY_CONTACT_LIMITS,poseContactBudget} from './breach-pose-contact-policy.ts';
import {ARMOR_PANEL_DEPTHS} from './operator-uniform-fit-envelope.ts';
import type {RiflePoint} from './breach-weapon-contact-zones.ts';
export type ContactMaterial='rigid'|'structured'|'soft';
export type PoseContactRegion='torso-core'|'torso-upper'|
 'front-lower'|'front-taper'|'side-flank'|'side-front-return'|
 'side-rear-return'|'side-insert'|'chest-rig';
export type PoseBox={label:'torso'|'front-armor'|'side-armor'|'side-plate'|'chest-rig';
 material:ContactMaterial;min:RiflePoint;max:RiflePoint;
 /** Optional for compatibility with authored synthetic collision tests. */
 region?:PoseContactRegion};
export type PoseClearanceEnvelope={armor:string;rig:string;top:string;
 front:number;boxes:readonly PoseBox[]};
const box=(label:PoseBox['label'],min:RiflePoint,max:RiflePoint,
 material:ContactMaterial='rigid',region?:PoseContactRegion):PoseBox=>
 ({label,material,min,max,region});
const sideBox=(label:PoseBox['label'],sign:number,
 x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,
 material:ContactMaterial,region:PoseContactRegion):PoseBox=>
 box(label,{x:Math.min(x0,x1),y:Math.min(y0,y1),
   z:Math.min(sign*z0,sign*z1)},
  {x:Math.max(x0,x1),y:Math.max(y0,y1),
   z:Math.max(sign*z0,sign*z1)},material,region);
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
  // The actual torso remains solid. Its upper *attachment region* tapers
  // rather than occupying imaginary volume out into the armhole.
  box('torso',{x:-5.1,y:-6,z:-5.15},
    {x:5.45,y:2.60,z:5.15},'rigid','torso-core'),
  box('torso',{x:-5.1,y:2.60,z:-4.55},
    {x:5.45,y:6.30,z:4.55},'rigid','torso-upper')
 ];
 const spec=ARMOR_PROPORTIONS[a];
 if(spec&&a!=='armor-bare'&&a!=='soft-slick'&&a!=='soft-paca'){
  // fittedArmorBag authors a clipped shoulder, not a rectangular slab.
  // Use its width/inset/y-break values for two cached collision tiers.
  const lower=spec.bottom;
  const upper=spec.top;
  const yBreak=Math.max(lower+1.6,upper-2.25);
  const width=Math.max(2.7,spec.width*.5-.20);
  const topWidth=Math.max(1.1,spec.width*.5-spec.upperInset);
  const material=a==='soft-flak'||a==='soft-vest'||
    a==='plate-legacy'?'soft':'rigid';
  const panelInner=fit.front-(ARMOR_PANEL_DEPTHS[a]??1.2)-.12;
  const panelOuter=fit.front+.24;
  boxes.push(box('front-armor',
    {x:panelInner,y:lower,z:-width},
    {x:panelOuter,y:yBreak,z:width},material,'front-lower'));
  boxes.push(box('front-armor',
    {x:panelInner,y:yBreak,z:-topWidth},
    {x:panelOuter,y:upper,z:topWidth},material,'front-taper'));
  const bands=spec.sideStyle==='open_two_band'?
    [-2.45,1.05].map(y=>({y,height:spec.sideHeight})):
    [{y:spec.sideY,height:spec.sideHeight}];
  if(spec.sideStyle!=='none'){
   for(const band of bands){
    if(band.height<.1)continue;
    const p=armorSideLayout(fit,spec,band.y,band.height);
    const y0=band.y-band.height*.5-.08;
    const y1=band.y+band.height*.5+.08;
    const half=spec.sideThickness*.5+.10;
    const material:ContactMaterial=spec.sideStyle==='side_plate'?
      'structured':'soft';
    for(const sign of [-1,1]){
     // Real attachedSide draws a thin flank plus two short returns.
     // The former single rectangle incorrectly filled all space between.
     boxes.push(sideBox('side-armor',sign,p.backX-.12,
       p.frontX+.12,y0,y1,p.centerZ-half,p.centerZ+half,
       material,'side-flank'));
     const returnHalf=Math.max(.28,p.returnThickness*.5+.10);
     const z0=Math.min(p.plateEdgeZ-.20,p.centerZ-half);
     const z1=p.centerZ+half;
     boxes.push(sideBox('side-armor',sign,
       p.frontX-returnHalf,p.frontX+returnHalf,y0,y1,
       z0,z1,material,'side-front-return'));
     boxes.push(sideBox('side-armor',sign,
       p.backX-returnHalf,p.backX+returnHalf,y0,y1,
       z0,z1,material,'side-rear-return'));
     if(spec.sideStyle==='side_plate'){
      // Heavy model has an actual hard protective insert OUTSIDE the
      // flexible carrier. Never turn this into soft carrier fabric.
      const inside=p.centerZ+spec.sideThickness*.5-.15;
      boxes.push(sideBox('side-plate',sign,
        -2.24,2.24,spec.sideY-.15-(spec.sidePlateHeight+.43)*.5,
        spec.sideY-.15+(spec.sidePlateHeight+.43)*.5,
        inside,inside+.72,'rigid','side-insert'));
     }
    }
   }
  }
 }
 if(r!=='no-rig'){
  const f=rigContactFrame(a,top,r);
  const visibleFront=Math.max(f.front.x+1.1,
   Math.min(f.front.x+3,(RIG_FRONT_PROFILES[r]?.front??8.5)+f.rigShiftX));
  boxes.push(box('chest-rig',
   {x:f.front.x-.1,y:f.front.y-3.9,z:-4.6},
   {x:visibleFront,y:f.front.y+3.9,z:4.6},'soft','chest-rig'));
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
export {LOW_READY_CONTACT_LIMITS} from './breach-pose-contact-policy.ts';
export type SleeveContactResult={
 valid:boolean;hardDepth:number;softDepth:number;quality:number;
 contacts:readonly {label:PoseBox['label'];material:ContactMaterial;
  depth:number;allowed:number;region?:PoseContactRegion;
  upperDepth:number;lowerDepth:number;
  upperAllowed:number;lowerAllowed:number;
  upperExcess:number;lowerExcess:number;
  blocking:boolean}[];
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
 // Conservative cheap broad phase. AABB of the limb centerline expanded
 // by the half-diagonal of its actual blocky sleeve; avoids SAT work for
 // distant side returns and rear attachments.
 const reach=Math.hypot(width,depth)*.5;
 if(Math.max(from.x,b.x)+reach<volume.min.x||
    Math.min(from.x,b.x)-reach>volume.max.x||
    Math.max(from.y,b.y)+reach<volume.min.y||
    Math.min(from.y,b.y)-reach>volume.max.y||
    Math.max(from.z,b.z)+reach<volume.min.z||
    Math.min(from.z,b.z)-reach>volume.max.z)return 0;
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
  const {upper:upperAllowed,lower:allowed}=
   poseContactBudget(volume,env,scale);
  if(volume.material==='rigid')hardDepth=Math.max(hardDepth,depth);
  else softDepth=Math.max(softDepth,depth);
  if(upper>upperAllowed+.001||lower>allowed+.001)valid=false;
  const excess=Math.max(0,upper-upperAllowed*.18)/
   Math.max(.1,upperAllowed)+
   Math.max(0,lower-allowed*.18)/Math.max(.1,allowed);
  quality+=excess*(.5+(volume.material==='rigid'?3:0));
  contacts.push({label:volume.label,material:volume.material,
   region:volume.region,
   depth,allowed:Math.max(allowed,upperAllowed),
   upperDepth:upper,lowerDepth:lower,
   upperAllowed,lowerAllowed:allowed,
   upperExcess:Math.max(0,upper-upperAllowed),
   lowerExcess:Math.max(0,lower-allowed),
   blocking:upper>upperAllowed+.001||lower>allowed+.001});
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
