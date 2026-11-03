/** Stage 3A: read-only garment-fit anatomy and attachment contract.
 * This module creates NON-RENDERING attachment groups. It never alters mesh
 * proportions, IK, footsteps, headgear, stock/grip alignment or hitboxes.
 *
 * Legacy operator-space: +X forward, +Y up, +/-Z shoulders. Do not mix with
 * the public -Z-forward root without applying the canonical frame.
 */
import * as THREE from 'three';
import {ANATOMY} from './breach-anatomy.ts';
import {LEG_HIP_HEIGHT,LEG_HIP_SIDE,LEG_LOWER_LENGTH,LEG_UPPER_LENGTH}
 from './breach-leg-geometry.ts';

/** Dimensions measured from the currently authored operator base. These are
 * baselines, NOT an approved new silhouette or the size of future garments.
 * Stage 3B clothing shells must be modeled around these fixed contacts.
 */
export const GARMENT_FIT_REFERENCE={
 chestCenterY:26,
 torso:{width:10,height:12,depth:14},
 pelvis:{centerY:LEG_HIP_HEIGHT,width:8,height:5,depth:12},
 shoulderLeft:ANATOMY.shoulderLeft,
 shoulderRight:ANATOMY.shoulderRight,
 headRest:ANATOMY.headRest,
 hipSide:LEG_HIP_SIDE,
 upperLegLength:LEG_UPPER_LENGTH,
 lowerLegLength:LEG_LOWER_LENGTH
} as const;

/** Visual layering is a construction policy, not a new physics collider.
 * Underlayers may overlap the body and be hidden under armor. The exposed
 * outer surfaces should not be coplanar (z-fighting). Rigid items never
 * shrink/compress an IK segment to make an outfit fit.
 */
export const GARMENT_FIT_LAYER_ORDER=[
 'skin','underlayer','outer-fabric','armor-textile','rig-textile','hardware'
] as const;
export const GARMENT_FIT_TOLERANCES={
 minDistinctSurfaceGap:.12,
 maxNeutralAnchorDrift:.001,
 /** Review collar/cuffs by eye: do not make a head-fit rule into geometry. */
 headgearReserved:true,
 armorOccludesUniform:true,
 knitCanBeCoveredByArmor:true,
 hardwareCannotReceiveClothCamouflage:true
} as const;

export const GARMENT_FIT_ANCHOR_IDS=[
 'torso','collar','front-hem','back-hem','shoulder-left','shoulder-right',
 'waist','upper-sleeve-left','upper-sleeve-right',
 'forearm-left','forearm-right','thigh-left','thigh-right',
 'knee-left','knee-right','shin-left','shin-right',
 'boot-left','boot-right'
] as const;
export type GarmentFitAnchorId=typeof GARMENT_FIT_ANCHOR_IDS[number];
export type GarmentFitAnchors=Readonly<Record<GarmentFitAnchorId,THREE.Group>>;
type ArticulatedLimb={upper:THREE.Mesh;lower:THREE.Mesh};
type ArticulatedFoot=ArticulatedLimb&{shoe:THREE.Mesh};
export type GarmentFitParents={
 chest:THREE.Group;hip:THREE.Group;
 arms:readonly ArticulatedLimb[];
 legs:readonly ArticulatedFoot[];
};
const place=(parent:THREE.Object3D,id:GarmentFitAnchorId,
 x=0,y=0,z=0):THREE.Group=>{
 const anchor=new THREE.Group();
 anchor.name='garment-fit:'+id;
 anchor.position.set(x,y,z);
 anchor.userData.garmentFitAnchor=id;
 // The node is transform-only and adds zero draw calls or triangles.
 parent.add(anchor);return anchor;
};

/** Bind one-time sewing and fit references to the real articulated parts.
 * Upper/lower bone anchors are at normalized mesh centers or joint ends:
 * bone.scale.y is the animated segment LENGTH (not a constant unit).
 */
export function createGarmentFitAnchors(p:GarmentFitParents):GarmentFitAnchors{
 const {chest,hip,arms,legs}=p;
 return {
  torso:place(chest,'torso'),
  collar:place(chest,'collar',0,6,0),
  'front-hem':place(chest,'front-hem',5,-6,0),
  'back-hem':place(chest,'back-hem',-5,-6,0),
  'shoulder-left':place(chest,'shoulder-left',
   ANATOMY.shoulderLeft.x,ANATOMY.shoulderLeft.y,ANATOMY.shoulderLeft.z),
  'shoulder-right':place(chest,'shoulder-right',
   ANATOMY.shoulderRight.x,ANATOMY.shoulderRight.y,ANATOMY.shoulderRight.z),
  waist:place(hip,'waist'),
  'upper-sleeve-left':place(arms[0].upper,'upper-sleeve-left'),
  'upper-sleeve-right':place(arms[1].upper,'upper-sleeve-right'),
  'forearm-left':place(arms[0].lower,'forearm-left'),
  'forearm-right':place(arms[1].lower,'forearm-right'),
  'thigh-left':place(legs[0].upper,'thigh-left'),
  'thigh-right':place(legs[1].upper,'thigh-right'),
  // The lower bone runs knee -> ankle, with its -Y end at the knee.
  'knee-left':place(legs[0].lower,'knee-left',0,-.5,0),
  'knee-right':place(legs[1].lower,'knee-right',0,-.5,0),
  'shin-left':place(legs[0].lower,'shin-left'),
  'shin-right':place(legs[1].lower,'shin-right'),
  'boot-left':place(legs[0].shoe,'boot-left'),
  'boot-right':place(legs[1].shoe,'boot-right')
 };
}
export function garmentFitWorldPoint(anchors:GarmentFitAnchors,
 id:GarmentFitAnchorId,out=new THREE.Vector3()):THREE.Vector3{
 // getWorldPosition updates the object's world matrix before sampling.
 return anchors[id].getWorldPosition(out);
}
/** Small diagnostic snapshot, opt-in from Operator Lab. Values report pose
 * clearance/spacing, not automatic failures: overlapping hidden layers and
 * tucked elbows are intentional. No physics/mesh transforms are changed.
 */
export type GarmentFitSnapshot={
 shoulderSpan:number;chestToWaist:number;collarToWaist:number;
 shoulderToUpperArm:[number,number];
 thighToWaist:[number,number];
 kneesToWaist:[number,number];
};
export function sampleGarmentFit(anchors:GarmentFitAnchors):GarmentFitSnapshot{
 const point=(id:GarmentFitAnchorId)=>garmentFitWorldPoint(anchors,id);
 const left=point('shoulder-left'),right=point('shoulder-right');
 const waist=point('waist'),collar=point('collar'),torso=point('torso');
 return {
  shoulderSpan:left.distanceTo(right),
  chestToWaist:torso.distanceTo(waist),
  collarToWaist:collar.distanceTo(waist),
  shoulderToUpperArm:[
   left.distanceTo(point('upper-sleeve-left')),
   right.distanceTo(point('upper-sleeve-right'))],
  thighToWaist:[
   waist.distanceTo(point('thigh-left')),
   waist.distanceTo(point('thigh-right'))],
  kneesToWaist:[
   waist.distanceTo(point('knee-left')),
   waist.distanceTo(point('knee-right'))]
 };
}
export function garmentFitDiagnosticLines(s:GarmentFitSnapshot):string[]{
 const f=(v:number)=>v.toFixed(2);
 return [
  'STAGE 3A · GARMENT FIT / PROPORTIONS LOCKED',
  'SHOULDERS '+f(s.shoulderSpan)+' · CHEST→WAIST '+f(s.chestToWaist),
  'COLLAR→WAIST '+f(s.collarToWaist),
  'SHOULDER→SLEEVE '+s.shoulderToUpperArm.map(f).join(' / '),
  'WAIST→THIGH '+s.thighToWaist.map(f).join(' / '),
  'WAIST→KNEE '+s.kneesToWaist.map(f).join(' / '),
  'GHOST ANCHORS ONLY · NO IK / HEADGEAR MODIFICATION',
  'LAYER INTERSECTIONS REQUIRE VISUAL REVIEW'
 ];
}
