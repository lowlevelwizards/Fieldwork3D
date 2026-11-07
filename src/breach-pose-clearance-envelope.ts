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
 'front-lower'|'front-taper'|'front-insert'|'side-flank'|'side-front-return'|
 'side-rear-return'|'side-insert'|'chest-rig'|
 'rig-backing'|'rig-pouch'|'rig-shelf';
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
/** Old fragmentation/legacy shoulder wraps are flexible, not solid
 * armhole walls. For ARM POSING only, inherit the heavy carrier's upper
 * side-band height while keeping the full visible historical garment,
 * full lower wrap and authentic soft materials. No physics/hitbox change.
 */
export function poseArmholeSideCeiling(armor:string):number|null{
 if(armor!=='soft-flak'&&armor!=='plate-legacy')return null;
 const heavy=ARMOR_PROPORTIONS['plate-heavy'];
 return heavy.sideY+heavy.sideHeight*.5+.08;
}
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
  // The outer bag is compressible textile. Only the independent insert
  // is genuinely hard; never model the whole fabric silhouette as plate.
  const material=a==='soft-flak'||a==='soft-vest'||
    a==='plate-legacy'?'soft':'structured';
  const panelInner=fit.front-(ARMOR_PANEL_DEPTHS[a]??1.2)-.12;
  const panelOuter=fit.front+.24;
  boxes.push(box('front-armor',
    {x:panelInner,y:lower,z:-width},
    {x:panelOuter,y:yBreak,z:width},material,'front-lower'));
  boxes.push(box('front-armor',
    {x:panelInner,y:yBreak,z:-topWidth},
    {x:panelOuter,y:upper,z:topWidth},material,'front-taper'));
  if(spec.family==='slick'||spec.family==='skeleton'||
     spec.family==='standard'||spec.family==='assault'){
   // A hard ballistic insert nests INSIDE the wider sewn carrier.
   // The actual modeled plate pouch may have protruding fabric,
   // shoulder cutouts and straps beyond this insert.
   const insertHalf=Math.max(2.65,
    Math.min(4.05,spec.width*.5-1.10));
   boxes.push(box('front-armor',
    {x:panelInner+.08,y:Math.max(lower+.88,-4.15),z:-insertHalf},
    {x:panelOuter-.24,y:Math.min(upper-.78,4.05),z:insertHalf},
    'rigid','front-insert'));
  }
  const bands=spec.sideStyle==='open_two_band'?
    [-2.45,1.05].map(y=>({y,height:spec.sideHeight})):
    [{y:spec.sideY,height:spec.sideHeight}];
  if(spec.sideStyle!=='none'){
   for(const band of bands){
    if(band.height<.1)continue;
    const p=armorSideLayout(fit,spec,band.y,band.height);
    const y0=band.y-band.height*.5-.08;
    const fullUpper=band.y+band.height*.5+.08;
    // The visible flak/legacy shoulder remains full height. A cloth
    // underarm panel flexes as the bicep comes down; the collision proxy
    // only keeps the heavy-carrier arm corridor, not an upper-armpit wall.
    const ceiling=poseArmholeSideCeiling(a);
    const y1=Math.min(fullUpper,ceiling??fullUpper);
    if(y1<=y0)continue;
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
  if(r==='full-chest'){
   // The modeled full-chest rig is a thin continuous textile bib with
   // FOUR separate lower pouches and two thin admin shelves. The old
   // single rectangle mistakenly filled the whole space from the body
   // to the pouch fronts, making the flexible cloth a solid cuboid.
   // Match authored rig geometry in operator-armor-rig-silhouettes.ts.
   const shift=f.rigShiftX;
   const pad=.09;
   boxes.push(box('chest-rig',
    {x:8.39+shift-.39-pad,y:-6.55-pad,z:-6.125-pad},
    {x:8.39+shift+.39+pad,y:3.10+pad,z:6.125+pad},
    'soft','rig-backing'));
   for(const z of [-4.60,-1.5,1.5,4.60]){
    // Cuboid pouch bodies; folded flap is small and pliable, not plate.
    boxes.push(box('chest-rig',
     {x:8.65+shift-.585-pad,y:-3.23-2.25-pad,z:z-1.375-pad},
     {x:8.65+shift+.585+.20,y:-3.23+2.25+pad,z:z+1.375+pad},
     'soft','rig-pouch'));
   }
   boxes.push(box('chest-rig',
    {x:8.56+shift-.225-pad,y:1.40-.825-pad,z:-4.41-pad},
    {x:8.56+shift+.225+pad,y:1.40+.825+pad,z:4.41+pad},
    'soft','rig-shelf'));
   boxes.push(box('chest-rig',
    {x:8.69+shift-.16-pad,y:.25-.37-pad,z:-4.825-pad},
    {x:8.69+shift+.16+pad,y:.25+.37+pad,z:4.825+pad},
    'soft','rig-shelf'));
  }else{
   // Unrefined legacy rigs retain their conservative aggregate bounds.
   boxes.push(box('chest-rig',
    {x:f.front.x-.1,y:f.front.y-3.9,z:-4.6},
    {x:visibleFront,y:f.front.y+3.9,z:4.6},
    'soft','chest-rig'));
  }
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
/** Allocation-free 15-axis sleeve OBB vs equipment AABB.
 * Same broad-phase, sleeve basis, separating axes and overlap-depth metric
 * as the previous Three.Vector3 implementation. This is the inner loop of
 * every equipment-aware elbow candidate evaluation; a temporary Vector3
 * per tested axis drove significant garbage collection on mobile.
 */
function sleeveBoxPenetration(
 a:THREE.Vector3,b:THREE.Vector3,width:number,depth:number,
 volume:PoseBox,trimProximal=0):number{
 const t=Math.max(0,Math.min(.3,trimProximal));
 const fx=a.x+(b.x-a.x)*t,fy=a.y+(b.y-a.y)*t,
   fz=a.z+(b.z-a.z)*t;
 const dx=b.x-fx,dy=b.y-fy,dz=b.z-fz;
 const length=Math.hypot(dx,dy,dz);
 if(length<1e-6)return 0;
 const reach=Math.hypot(width,depth)*.5;
 if(Math.max(fx,b.x)+reach<volume.min.x||
    Math.min(fx,b.x)-reach>volume.max.x||
    Math.max(fy,b.y)+reach<volume.min.y||
    Math.min(fy,b.y)-reach>volume.max.y||
    Math.max(fz,b.z)+reach<volume.min.z||
    Math.min(fz,b.z)-reach>volume.max.z)return 0;
 // World-space unit arm axis; exactly the same reference Z and X
 // fallback used by the previous Gram-Schmidt sleeve construction.
 const ux=dx/length,uy=dy/length,uz=dz/length;
 let sx=-uz*ux,sy=-uz*uy,sz=1-uz*uz;
 let sideSq=sx*sx+sy*sy+sz*sz;
 if(sideSq<.000001){
  sx=1-ux*ux;sy=-ux*uy;sz=-ux*uz;
  sideSq=sx*sx+sy*sy+sz*sz;
 }
 const sideScale=1/Math.sqrt(sideSq);
 sx*=sideScale;sy*=sideScale;sz*=sideScale;
 let bx=sy*uz-sz*uy,by=sz*ux-sx*uz,bz=sx*uy-sy*ux;
 const bScale=1/Math.hypot(bx,by,bz);
 bx*=bScale;by*=bScale;bz*=bScale;
 const hx=width*.5,hy=length*.5,hz=depth*.5;
 const mx=(fx+b.x)*.5-(volume.min.x+volume.max.x)*.5;
 const my=(fy+b.y)*.5-(volume.min.y+volume.max.y)*.5;
 const mz=(fz+b.z)*.5-(volume.min.z+volume.max.z)*.5;
 const vx=(volume.max.x-volume.min.x)*.5;
 const vy=(volume.max.y-volume.min.y)*.5;
 const vz=(volume.max.z-volume.min.z)*.5;
 let minimum=Infinity;
 // Project both OBB half-extents onto an arbitrary separating axis.
 // Normalization only happens for a surviving axis, matching the prior
 // depth metric while avoiding a normalized vector allocation.
 const consider=(ax:number,ay:number,az:number):boolean=>{
  const squared=ax*ax+ay*ay+az*az;
  if(squared<1e-9)return true;
  const ra=Math.abs(ax*sx+ay*sy+az*sz)*hx+
    Math.abs(ax*ux+ay*uy+az*uz)*hy+
    Math.abs(ax*bx+ay*by+az*bz)*hz;
  const rb=Math.abs(ax)*vx+Math.abs(ay)*vy+Math.abs(az)*vz;
  const overlap=ra+rb-Math.abs(ax*mx+ay*my+az*mz);
  if(overlap<=0)return false;
  minimum=Math.min(minimum,overlap/Math.sqrt(squared));
  return true;
 };
 // Three world axes, three sleeve axes, then nine crossed axes.
 if(!consider(1,0,0)||!consider(0,1,0)||!consider(0,0,1)||
    !consider(sx,sy,sz)||!consider(ux,uy,uz)||
    !consider(bx,by,bz))return 0;
 if(!consider(0,-sz,sy)||!consider(sz,0,-sx)||
    !consider(-sy,sx,0)||
    !consider(0,-uz,uy)||!consider(uz,0,-ux)||
    !consider(-uy,ux,0)||
    !consider(0,-bz,by)||!consider(bz,0,-bx)||
    !consider(-by,bx,0))return 0;
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
  // The real upper sleeve is SEWN into the shoulder/neck line. The
  // shoulder-end rectangle naturally overlaps its own rigid upper torso:
  // this is an attachment, not a forearm crossing through the abdomen.
  // Trim ONLY the proximal upper segment against torso-upper; the lower
  // torso and all rigid front/side ballistic inserts keep their original
  // strict budget and their original segment starting position.
  const proximal=volume.region==='torso-upper'?.30:
   LOW_READY_CONTACT_LIMITS.proximalUpperSeam;
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
