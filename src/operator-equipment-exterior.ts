/** SR1 — shared chest-local visual surfaces, derived from existing garment,
 * armor and rig authors. No scene traversal, inventory or physics changes.
 * Arm contact boxes are useful for pouch detail but not a replacement for
 * the visible garment, rear plate or full-height fabric side shell. */
import {garmentContactAnchor} from './operator-garment-contact-surface.ts';
import {fittedArmorSurfaces} from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import {armorStrapLanding,JPC_BRANCH_HALF_SPREAD,JPC_BRANCH_WIDTH,plateHalfWidthAt} from './operator-armor-straps.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {armorSideLayout} from './operator-armor-side-layout.ts';
import {poseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';

export type SlingShoulderLane=Readonly<{
 kind:'outside'|'open-branch';crown:readonly [number,number,number];
 frontEntry?:readonly [number,number,number];
}>;
export type ShoulderContactPoint=readonly [number,number,number];
export type ShoulderContour=Readonly<{rear:ShoulderContactPoint;crown:ShoulderContactPoint;front:ShoulderContactPoint}>;
export type EquipmentExterior=Readonly<{
 front:(y:number,z:number)=>number;
 back:(y:number,z:number)=>number;
 side:(y:number,x:number,sign:-1|1)=>number;
 shoulder:(sign:-1|1)=>readonly [number,number,number];
 slingShoulder:(sign:-1|1,width:number)=>SlingShoulderLane;
 shoulderContour:(sign:-1|1,lateral:number,width:number,thickness:number)=>ShoulderContour;
}>;
const cache=new Map<string,EquipmentExterior>();
export function equipmentExterior(armor:string,rig:string,top:string,sharedRig=false):EquipmentExterior{
 const env=poseClearanceEnvelope(armor,rig,top);
 const key=env.armor+'|'+env.rig+'|'+top+'|'+sharedRig;
 const hit=cache.get(key);if(hit)return hit;
 const a=env.armor,r=env.rig;
 const fit=fittedArmorSurfaces(a,top,ARMOR_PROFILES[a]);
 const spec=ARMOR_PROPORTIONS[a];
 const visible=!!spec&&spec.family!=='concealed';
 const frame=rigContactFrame(a,top,r);
 const rigBoxes=env.boxes.filter(b=>b.label==='chest-rig');
 const front=(y:number,z:number)=>{
  let v=garmentContactAnchor(top,y).front;
  if(visible&&y>=spec.bottom&&y<=spec.top&&Math.abs(z)<=plateHalfWidthAt(spec,y))
   v=Math.max(v,fit.front+.24);
  for(const b of rigBoxes)
   if(y>=b.min.y&&y<=b.max.y&&z>=b.min.z&&z<=b.max.z)
    v=Math.max(v,b.max.x);
  return v;
 };
 const back=(y:number,z:number)=>{
  let v=garmentContactAnchor(top,y).back;
  if(visible&&y>=spec.bottom+.2&&y<=spec.top-.2&&Math.abs(z)<=plateHalfWidthAt(spec,y,true))
   v=Math.min(v,fit.back-.07);
  return v;
 };
 const side=(y:number,x:number,sign:-1|1)=>{
  let v=garmentContactAnchor(top,y).side;
  if(visible&&spec.sideStyle!=='none'){
   const bands=spec.sideStyle==='open_two_band'?[-2.45,1.05]:[spec.sideY];
   for(const by of bands)if(Math.abs(y-by)<=spec.sideHeight*.5){
    const layout=armorSideLayout(fit,spec,by,spec.sideHeight);
    if(x>=layout.backX&&x<=layout.frontX)
     v=Math.max(v,layout.centerZ+spec.sideThickness*.5+.10);
   }
  }
  for(const b of env.boxes)
   if(b.label!=='torso'&&y>=b.min.y&&y<=b.max.y&&x>=b.min.x&&x<=b.max.x)
    v=Math.max(v,sign===1?b.max.z:-b.min.z);
  return sign*v;
 };
 // Contact is sampled on the actual garment shoulder and the authored
 // armor bridge (not a horizontal span between the front/back plate faces).
 const shoulderContour=(sign:-1|1,lateral:number,width:number,thickness:number):ShoulderContour=>{
  const cloth=garmentContactAnchor(top,5.2);
  const z=sign*Math.min(cloth.side-width*.5-.08,Math.max(1.8,Math.abs(lateral)));
  const land=visible&&spec?armorStrapLanding(fit,spec):undefined;
  const onArmor=!!land&&Math.abs(Math.abs(z)-land.shoulderZ)<(spec.shoulderWidth+width)*.5;
  // Existing rig shoulder center includes the armor already. Do not add
  // armor thickness twice. Only overlapping textile lanes add a layer.
  const onRig=!sharedRig&&r!=='no-rig'&&frame.mode==='external-harness'&&
   Math.abs(Math.abs(z)-frame.shoulderRight.z)<(.92+width)*.5;
  const armorCrown=onArmor?fit.shoulderY+spec.strapThickness*.5:cloth.topY;
  const crownY=Math.max(cloth.topY,armorCrown,onRig?frame.shoulderY+.24:0)+thickness*.5-.035;
  const edgeY=Math.max(cloth.topY-.04,crownY-(onArmor?.27:.10));
  return {rear:[cloth.back-.12,edgeY,z],crown:[0,crownY,z],front:[cloth.front+.12,edgeY,z]};
 };
 const shoulder=(sign:-1|1):ShoulderContactPoint=>shoulderContour(sign,frame.shoulderRight.z,.85,0).crown;
 // Only the modeled skeletal front branch has an authored opening.
 // Do not invent a tunnel underneath solid shoulder pads or a rig yoke.
 // The common crown is still routed on top; the opening is a front entry.
 const slingShoulder=(sign:-1|1,width:number):SlingShoulderLane=>{
  const crown=shoulder(sign);
  const gap=2*JPC_BRANCH_HALF_SPREAD-JPC_BRANCH_WIDTH;
  if(a==='plate-jpc'&&spec&&(r==='no-rig'||frame.mode==='carrier-placard')&&
    width+.08<=gap){
   const landing=armorStrapLanding(fit,spec);
   return {kind:'open-branch',crown,
    frontEntry:[fit.front+.24,landing.frontY+.12,sign*landing.frontZ]};
  }
  return {kind:'outside',crown};
 };
 const result={front,back,side,shoulder,shoulderContour,slingShoulder};cache.set(key,result);return result;
}
