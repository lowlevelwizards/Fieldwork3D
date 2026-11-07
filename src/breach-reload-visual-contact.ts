/** Render-only contact tolerance for stylized arm-to-gear presentation.
 * Gameplay collision, bone length, hitboxes and shot muzzle are unchanged.
 */
import type {SleeveContactResult} from './breach-pose-clearance-envelope.ts';

export const RELOAD_V4_MAX_HARD_OVERLAP=2.65;
export type ReloadVisualContactReport={
 valid:boolean;strictValid:boolean;acceptedOverlaps:number;
 maxRigidIntersection:number;
};
export function reloadVisualContact(
 contact:SleeveContactResult,enabled:boolean,
 profile:'reload'|'carry'|'aim'='reload',
 role:'firing'|'support'='support'
):ReloadVisualContactReport{
 const strictValid=contact.valid;
 if(!enabled)return {valid:strictValid,strictValid,
  acceptedOverlaps:0,maxRigidIntersection:contact.hardDepth};
 const action=profile==='reload';
 // The firing-side sleeve may sink a fraction farther into the EDGE
 // of a plate pouch as its elbow lowers. Never increase torso budgets,
 // support-arm allowance, or the reload limits.
 const firing=role==='firing'&&!action;
 let valid=true,acceptedOverlaps=0;
 for(const c of contact.contacts){
  let upper=c.upperAllowed,lower=c.lowerAllowed;
  // The arm cuboids may visually sink under *worn* equipment. This is
  // finite: a forearm through the torso center or a truly deep collision
  // still fails and is never solved by stretching a bone.
  if(c.material==='rigid'){
   switch(c.region){
    case 'torso-upper':
      upper=Math.max(upper,action?2.65:1.15);
      lower=Math.max(lower,action?.85:.50);break;
    case 'torso-core':
      upper=Math.max(upper,action?2.10:.70);
      lower=Math.max(lower,action?1.05:.35);break;
    case 'front-insert':
      upper=Math.max(upper,action?2.65:firing?2.12:1.85);
      lower=Math.max(lower,action?1.60:firing?1.08:.95);break;
    case 'side-insert':
      upper=Math.max(upper,action?2.40:firing?1.94:1.75);
      lower=Math.max(lower,action?1.35:firing?.94:.85);break;
   }
  }else if(c.material==='structured'){
   upper=Math.max(upper,action?2.65:1.90);
   lower=Math.max(lower,action?2.25:1.30);
  }else{
   upper=Math.max(upper,action?3.45:2.40);
   lower=Math.max(lower,action?3.00:1.80);
  }
  if(c.upperDepth>upper+.001||c.lowerDepth>lower+.001)
   valid=false;
  else if(c.blocking)acceptedOverlaps++;
 }
 return {valid,strictValid,acceptedOverlaps,
  maxRigidIntersection:contact.hardDepth};
}
