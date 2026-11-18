/** M2.1: deterministic, read-only physical mounting positions for authored
 * weapon geometry. A *candidate contact* is not an equipped attachment, nor
 * does it establish clamp width, eye relief or non-overlap. M2.2 handles those.
 *
 * Inputs are installed part interfaces AND the actual geometric construction:
 * never infer a mount merely from family name, generic role, or a decoration.
 * X points toward muzzle, Y up, +Z weapon-right, -Z weapon-left.
 * Computed on configuration edits; do not invoke from an animation frame.
 */
import type {FamilyPartSlot,PartMountRole,PartMountStandard,WeaponFamilyBuild}
 from '../../equipment-weapon-families.ts';
import {weaponPartMountSurfaces,type WeaponMountSurface}
 from './weapon-part-mount-surfaces.ts';
import {AR_HANDGUARD_START,arHandguardEnd}
 from '../../breach-weapon-contact-zones.ts';
import {HK_CLAW_VISUAL} from './hk-rail-accessories.ts';
import {AK_SIDE_MOUNT_ART} from './ak-side-mount-geometry.ts';

export type PhysicalMountFace='top'|'bottom'|'left'|'right';
export type PhysicalMountSupport='rail-tooth'|'continuous-rail'|'claw-foot'|'dovetail-bar';
export type PhysicalMountSlot=Readonly<{
 /** Stable across save-independent queries, never array-indexed by the UI. */
 id:string;
 /** The M1 source surface; its declared capability must exist. */
 surfaceId:string;
 ownerPartId:string;
 ownerSlot:FamilyPartSlot|'opticMount';
 standard:PartMountStandard;
 role:PartMountRole;
 face:PhysicalMountFace;
 support:PhysicalMountSupport;
 /** Surface point in the weapon builder's exact local art coordinates. */
 x:number;y:number;z:number;
 /** Unit surface-normal components. This is not an aim direction. */
 normalX:0;normalY:-1|0|1;normalZ:-1|0|1;
 /** Exposed span for the individual contact candidate, *not* the footprint
  * of an accessory or permission to bridge onto neighboring geometry.
  */
 contactStartX:number;contactEndX:number;
 /** The continuous structural rail body or bridge supporting this tooth.
  * Unlike the decorative tooth's X span, this is the clamp clearance bound.
  */
 railStartX:number;railEndX:number;
 /** Locations on one continuous support share this owner/face group. */
 groupId:string;
 /** Four HK claw feet form a single inseparable adapter mount. */
 requiresGroup?:'hk-claw-four-foot';
}>;

const AR_RAIL_HANDGUARDS=new Set([
 'ar-quad','ar-m5-rail','ar-risii','ar-compact-rail'
]);

type SideFace='left'|'right';
const sides:readonly SideFace[]=['left','right'];
const sideSign=(face:SideFace):-1|1=>face==='left'?-1:1;

function slot(source:WeaponMountSurface,
 face:PhysicalMountFace,support:PhysicalMountSupport,
 index:number,x:number,y:number,z:number,
 contactStartX:number,contactEndX:number,
 railStartX:number,railEndX:number,
 requiresGroup?:'hk-claw-four-foot'):PhysicalMountSlot{
 const surfaceId=source.id;
 const groupId=surfaceId+':'+face;
 return {
  id:groupId+':'+support+':'+index,
  surfaceId,ownerPartId:source.ownerPartId,ownerSlot:source.ownerSlot,
  standard:source.standard,role:source.role,face,support,
  x,y,z,
  normalX:0,normalY:face==='top'?1:face==='bottom'?-1:0,
  normalZ:face==='left'?-1:face==='right'?1:0,
  contactStartX,contactEndX,railStartX,railEndX,groupId,
  ...(requiresGroup?{requiresGroup}:{})
 };
}

/** Instanced AR teeth use the exact formula in addARRailSegments. */
function arToothSlots(source:WeaponMountSurface,face:PhysicalMountFace,
 count:number,startX:number,endX:number,
 y:number,z:number,railStartX:number,railEndX:number):PhysicalMountSlot[]{
 const result:PhysicalMountSlot[]=[];
 const span=endX-startX;
 for(let i=0;i<count;i++){
  const x=startX+.80+i*(span-1.60)/(count-1);
  // addARRailSegments authors teeth with X width .66.
  result.push(slot(source,face,'rail-tooth',i,x,y,z,
   x-.33,x+.33,railStartX,railEndX));
 }
 return result;
}

/** A continuous modeled block/bridge has no discrete teeth. These three
 * reproducible contact centers are coarse preview zones, not invented rail
 * teeth, pitch measurements, or proof that any particular clamp fits.
 */
function continuousSlots(source:WeaponMountSurface,face:PhysicalMountFace,
 startX:number,endX:number,y:number,z:number):PhysicalMountSlot[]{
 if(!(endX>startX))return [];
 const span=endX-startX;
 return [.25,.5,.75].map((fraction,i)=>
  slot(source,face,'continuous-rail',i,
   startX+span*fraction,y,z,startX,endX,startX,endX));
}

function appendSource(result:PhysicalMountSlot[],source:WeaponMountSurface,
 build:WeaponFamilyBuild):void{
 const part=source.ownerPartId;
 if(part==='g36-rail-receiver'&&source.role==='optic'&&source.face==='top'){
  result.push(...continuousSlots(source,'top',
   source.startX,source.endX,source.y,0));
  return;
 }
 if(part==='g36-handguard-k-rail'&&source.ownerSlot==='handguard'){
  if(source.role==='foregrip'&&source.face==='bottom')
   result.push(...continuousSlots(source,'bottom',
    source.startX,source.endX,-2.15,0));
  else if(source.role==='light'&&source.face==='side')
   for(const face of sides)
    result.push(...continuousSlots(source,face,
     source.startX,source.endX,-.20,sideSign(face)*1.61));
  return;
 }
 if(part==='ar-flat'&&source.role==='optic'&&source.face==='top'){
  // Receiver builder: [-5.3,2.3], three teeth, topY=2.84.
  result.push(...arToothSlots(source,'top',3,-5.3,2.3,3.01,0,-5.65,2.65));
  return;
 }
 if(AR_RAIL_HANDGUARDS.has(part)&&source.ownerSlot==='handguard'){
  const start=AR_HANDGUARD_START,end=arHandguardEnd(part);
  const count=part==='ar-m5-rail'?5:4;
  const ris=part==='ar-risii';
  if(source.role==='foregrip'&&source.face==='bottom'){
   const bottomY=(ris?-1.47:-1.65)-.17;
   result.push(...arToothSlots(source,'bottom',count,start,end,bottomY,0,
    start+.35,end-.35));
  }else if(source.role==='light'&&source.face==='side'&&
   part!=='ar-compact-rail'){
   // Compact rail is fully covered on both sides; no teeth are generated.
   // AR teeth are centered at +/-2.39 with depth .36. Contact plane is
   // the *outer* face 2.39+.18, not the tooth center from M1.
   for(const face of sides)
    result.push(...arToothSlots(source,face,count,start,end,
     .59,sideSign(face)*2.57,start+.60,end-.60));
  }
  return;
 }
 if(source.standard==='ak-side-dovetail'&&
  source.ownerSlot==='receiver'&&build.family==='ak'){
  // The receiver dovetail is left-only (negative Z), independent of
  // anything under the fore-end. Proprietary direct-fit sight variants
  // can use this interface later without an invented Picatinny adapter.
  const d=AK_SIDE_MOUNT_ART;
  if(source.role==='opticMount')
   result.push(slot(source,'left','dovetail-bar',0,
    d.centerX,d.contactY,d.contactZ,
    d.startX,d.endX,d.startX,d.endX));
  else if(source.role==='optic')
   result.push(...continuousSlots(source,'left',d.startX,
    d.endX,d.contactY,d.contactZ));
  return;
 }
 if(part==='optic-ak-side-picatinny'&&
  source.ownerSlot==='opticMount'&&source.role==='optic'&&
  source.face==='top'){
  const d=AK_SIDE_MOUNT_ART;
  result.push(...continuousSlots(source,'top',d.bridgeStartX,
   d.bridgeEndX,d.bridgeTopY,0));
  return;
 }
 if(part==='ak-rail-long'&&source.role==='optic'&&source.face==='top'){
  // AK builder's *only* actual rail is the handguard's upper block.
  // Use its M1-derived exact box span, no synthetic foregrip/side rails.
  result.push(...continuousSlots(source,'top',
   source.startX,source.endX,3.12,0));
  return;
 }
 if(part==='hk-mp5-trirail'&&source.ownerSlot==='handguard'){
  // MP5 tri-rail builder: block extends start+.30 .. end-.30;
  // side cuboids at +/-1.54, with half-depth .215.
  if(source.role==='foregrip'&&source.face==='bottom')
   result.push(...continuousSlots(source,'bottom',source.startX,
    source.endX,-1.775,0));
  else if(source.role==='light'&&source.face==='side')
   for(const face of sides)
    result.push(...continuousSlots(source,face,source.startX,
     source.endX,-.29,sideSign(face)*1.755));
  return;
 }
 if(source.standard==='hk-claw'&&source.role==='opticMount'&&
  source.ownerSlot==='receiver'&&build.family==='hk'){
  // The bridge places four extruded feet at these authored centers.
  // Represent all four as ONE group requirement, not 4 independent mounts.
  for(const [index,x] of [HK_CLAW_VISUAL.rearX,HK_CLAW_VISUAL.frontX].entries())
   for(const face of sides)
    result.push(slot(source,face,'claw-foot',index,x,1.75,
     sideSign(face)*HK_CLAW_VISUAL.footZ,x-.62,x+.64,
     x-.62,x+.64,'hk-claw-four-foot'));
  return;
 }
 if(part==='optic-hk-claw'&&source.ownerSlot==='opticMount'&&
  source.role==='optic'&&source.face==='top'){
  // Continuous bridge support at Y=3.15, not a fictional row of teeth.
  result.push(...continuousSlots(source,'top',
   source.startX,source.endX,HK_CLAW_VISUAL.supportTopY,0));
 }
}

/** Only modeled interfaces produce candidate physical positions. Unbuilt AK
 * lower/lateral surfaces and covered AR compact sides return ZERO positions,
 * even while the legacy M1 catalog still lists them for save compatibility.
 * Named optic/laser variants and adapter costs are deliberately out of scope.
 */
export function physicalWeaponMountSlots(build:WeaponFamilyBuild,
 opticMount='optic-mount-none'):readonly PhysicalMountSlot[]{
 const sources=weaponPartMountSurfaces(build,opticMount);
 const result:PhysicalMountSlot[]=[];
 for(const source of sources)appendSource(result,source,build);
 return result;
}

/** A convenient role projection for later M2 footprint/UI work; results
 * never mutate or silently equip parts.
 */
export function physicalMountSlotsForRole(build:WeaponFamilyBuild,
 role:PartMountRole,opticMount='optic-mount-none'):readonly PhysicalMountSlot[]{
 return physicalWeaponMountSlots(build,opticMount).filter(s=>s.role===role);
}
