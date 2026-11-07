/** B24b visual-only tolerance for the chunky Fieldwork reload animation.
 * NOT a simulation, movement, weapon, hitbox or general pose collision rule.
 * Keep measured intersection depths visible to the Lab for art review.
 */
import type {SleeveContactResult} from './breach-pose-clearance-envelope.ts';

export const RELOAD_V4_MAX_HARD_OVERLAP=2.65;
export type ReloadVisualContactReport={
 valid:boolean;strictValid:boolean;acceptedOverlaps:number;
 maxRigidIntersection:number;
};
export function reloadVisualContact(
 contact:SleeveContactResult,enabled:boolean
):ReloadVisualContactReport{
 const strictValid=contact.valid;
 if(!enabled)return {valid:strictValid,strictValid,
  acceptedOverlaps:0,maxRigidIntersection:contact.hardDepth};
 let valid=true,acceptedOverlaps=0;
 for(const c of contact.contacts){
  let upper=c.upperAllowed,lower=c.lowerAllowed;
  // The arm cuboids may visually sink under *worn* equipment. This is
  // finite: a forearm through the torso center or a truly deep collision
  // still fails and is never solved by stretching a bone.
  if(c.material==='rigid'){
   switch(c.region){
    case 'torso-upper':
      upper=Math.max(upper,2.65);lower=Math.max(lower,.85);break;
    case 'torso-core':
      upper=Math.max(upper,2.10);lower=Math.max(lower,1.05);break;
    case 'front-insert':
      upper=Math.max(upper,2.65);lower=Math.max(lower,1.60);break;
    case 'side-insert':
      upper=Math.max(upper,2.40);lower=Math.max(lower,1.35);break;
   }
  }else if(c.material==='structured'){
   upper=Math.max(upper,2.65);lower=Math.max(lower,2.25);
  }else{
   upper=Math.max(upper,3.45);lower=Math.max(lower,3.00);
  }
  if(c.upperDepth>upper+.001||c.lowerDepth>lower+.001)
   valid=false;
  else if(c.blocking)acceptedOverlaps++;
 }
 return {valid,strictValid,acceptedOverlaps,
  maxRigidIntersection:contact.hardDepth};
}
