/** Local armor accommodation rules shared by the live IK and pose Lab.
 * Geometry and visual equipment remain unchanged. Only flexible material
 * can compress, and ONLY in physically justified attachment regions.
 * A hard torso/ballistic insert always retains the original rigid budget.
 */
import type {PoseBox,PoseClearanceEnvelope} from './breach-pose-clearance-envelope.ts';
export const LOW_READY_CONTACT_LIMITS={
 rigid:.12,structured:.34,soft:.56,
 maximumSoftScale:1.65,proximalUpperSeam:.16
} as const;
export type ContactBudget={upper:number;lower:number};
/** World units; no scaling of the hard limit under ANY equipment profile. */
export function poseContactBudget(volume:PoseBox,env:PoseClearanceEnvelope,
 softScale=1):ContactBudget{
 const c=LOW_READY_CONTACT_LIMITS;
 if(volume.material==='rigid')return {upper:c.rigid,lower:c.rigid};
 const scale=Math.max(1,Math.min(c.maximumSoftScale,softScale));
 const base=c[volume.material]*scale;
 let upper=base,lower=base;
 switch(volume.region){
  case 'side-flank':
   if(volume.material==='structured'){
    upper=Math.max(base,.68);lower=Math.max(base,.78);
   }else{
    upper=Math.max(base,1.30);lower=Math.max(base,1.35);
   }
   // The real flak/legacy shoulder wrap sits OVER the sleeve attachment.
   // Never grant that allowance to a front plate, forearm or rear return.
   if(volume.material==='soft'&&['soft-flak','soft-vest',
      'plate-legacy'].includes(env.armor))
    upper=Math.max(upper,env.armor==='plate-legacy'?2.88:2.50);
   break;
  case 'side-front-return':
   if(volume.material==='structured'){
    upper=Math.max(base,.62);lower=Math.max(base,.72);
   }else{
    upper=Math.max(base,1.23);lower=Math.max(base,1.05);
   }
   break;
  case 'side-rear-return':
   if(volume.material==='structured'){
    upper=Math.max(base,.58);lower=Math.max(base,.60);
   }else{
    upper=Math.max(base,.95);lower=Math.max(base,.78);
   }
   break;
  case 'front-taper':
   if(volume.material==='soft'){
    upper=Math.max(base,1.25);
    lower=Math.max(base,.92);
   }
   break;
  case 'front-lower':
   if(volume.material==='soft'){
    upper=Math.max(base,1.18);
    lower=Math.max(base,.75);
   }
   break;
  case 'chest-rig':
   if(volume.material==='soft'){
    upper=Math.max(base,.90);lower=Math.max(base,1.02);
   }
   break;
 }
 return {upper,lower};
}
