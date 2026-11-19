/** Operator Lab A3.10 — fixed, seekable interaction contacts.
 * Real operator rig and single pose solver are used for the visual. The
 * fixture is a KNOWN, visible practice door or matching lead operator,
 * not a substitute for live GO-time contact selection or door physics.
 */
import type {PhysicalContact} from './breach-physical-contact-anchor.ts';
import {teammateShoulderPoint}
 from './breach-contextual-support-contact.ts';
import type {LabTrack} from './breach-lab-tracks.ts';

export const LAB_CONTACT_TRACKS=[
 'pre-open-handle','pre-open-hinge','pre-open-cancel',
 'stack-shoulder','stack-shoulder-crouch','stack-shoulder-cancel'
] as const;
export type LabContactTrack=typeof LAB_CONTACT_TRACKS[number];
export function isLabContactTrack(track:LabTrack):track is LabContactTrack{
 return (LAB_CONTACT_TRACKS as readonly string[]).includes(track);
}
export const labContactLead=Object.freeze({x:23,z:0,heading:0});
const START=.40,RELEASE=2.25;
export function labContactPose(track:LabTrack,seconds:number):
 PhysicalContact|null{
 if(!isLabContactTrack(track))return null;
 // Mid-action cancellation is reconstructed from the selected timeline,
 // so reverse seek never needs retained state or a second animation clock.
 const cancelled=track.endsWith('-cancel');
 const until=cancelled&&seconds>=RELEASE?RELEASE:null;
 const stack=track.startsWith('stack');
 if(stack){
  const crouch=track==='stack-shoulder-crouch';
  const shoulder=teammateShoulderPoint({
   p:{x:labContactLead.x,y:labContactLead.z},
   heading:labContactLead.heading,
   posture:crouch?'crouch':'stand',coverStanceDrop:0
  });
  return {intent:'teammate',limb:'support-hand',
   anchor:{target:'teammate',id:'lab-lead',
    point:shoulder,normal:{x:-.25,y:Math.sqrt(1-.25*.25),z:0}},
   startedAt:START,releasedAt:until};
 }
 // The practice door panel occupies x=18 after the shared -10 offset.
 // Handle is x=15.5,z=8; near hinge contact is x=17.5,z=-6.
 const hinge=track==='pre-open-hinge';
 return {intent:'door',limb:'support-hand',
  anchor:{target:'door',id:'lab-practice-door:pre-open',
   point:hinge?{x:17.5,y:19,z:-6}:{x:15.5,y:19,z:8},
   normal:{x:-1,y:0,z:0}},
  startedAt:START,releasedAt:until};
}
export function labContactDescription(track:LabTrack,time:number):string{
 if(!isLabContactTrack(track))return '';
 const contact=labContactPose(track,time)!;
 return (track.startsWith('stack')?
  'Stack · palm on top of the lead operator’s shoulder':
  track==='pre-open-hinge'?
   'Queued OPEN · hinge-side upper panel fallback':
   'Queued OPEN · physical handle contact')+
  (contact.releasedAt!==null?
   ' · CANCELLED · returning to ordinary weapon grip':
   ' · support hand planted');
}
