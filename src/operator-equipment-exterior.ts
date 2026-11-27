/** SR1 — shared chest-local visual surfaces, derived from existing garment,
 * armor and rig authors. No scene traversal, inventory or physics changes.
 * Arm contact boxes are useful for pouch detail but not a replacement for
 * the visible garment, rear plate or full-height fabric side shell. */
import {garmentContactAnchor} from './operator-garment-contact-surface.ts';
import {fittedArmorSurfaces} from './operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import {plateHalfWidthAt} from './operator-armor-straps.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
import {armorSideLayout} from './operator-armor-side-layout.ts';
import {poseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';

export type EquipmentExterior=Readonly<{
 front:(y:number,z:number)=>number;
 back:(y:number,z:number)=>number;
 side:(y:number,x:number,sign:-1|1)=>number;
 shoulder:(sign:-1|1)=>readonly [number,number,number];
}>;
const cache=new Map<string,EquipmentExterior>();
export function equipmentExterior(armor:string,rig:string,top:string):EquipmentExterior{
 const env=poseClearanceEnvelope(armor,rig,top);
 const key=env.armor+'|'+env.rig+'|'+top;
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
   v=Math.min(v,fit.back-.24);
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
 const shoulder=(sign:-1|1):readonly [number,number,number]=>{
  const bare=garmentContactAnchor(top,5.2);
  return [0,Math.max(bare.topY,frame.shoulderY)+
    (visible?spec.strapThickness*.5:0)+(frame.mode==='external-harness'&&r!=='no-rig'?.32:0),
    sign*frame.shoulderRight.z];
 };
 const result={front,back,side,shoulder};cache.set(key,result);return result;
}
