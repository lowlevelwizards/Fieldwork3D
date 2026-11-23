/** Operator Lab's authoritative art-space pistol hand contacts.
 * The issued Glock gun and shot geometry are unchanged: only Lab passes
 * these contacts to presentation. Per-model sockets preserve the authored
 * G26/G19X and Beretta grip/slide differences.
 */
import {isGlockAppearanceId,glockArtSockets}
 from './weapons/geometry/glock-family-silhouettes.ts';
import {isM9AppearanceId,m9ArtSockets}
 from './weapons/geometry/beretta-m9-silhouettes.ts';
import type {SidearmPreviewId} from './weapons/geometry/sidearm-preview.ts';
import type {LabPistolContacts} from './secondary-upper-body-pose.ts';
import {LAB_PISTOL_PREVIEW_SCALE} from './operator-lab-pistol-tracks.ts';

const cached=new Map<SidearmPreviewId,LabPistolContacts>();
export function labPistolContacts(id:SidearmPreviewId):LabPistolContacts{
 const saved=cached.get(id);
 if(saved)return saved;
 const sockets=isGlockAppearanceId(id)?glockArtSockets(id):
  isM9AppearanceId(id)?m9ArtSockets(id):null;
 if(!sockets)throw Error('No authored pistol sockets: '+id);
 const grip=sockets.primaryGrip;
 const scale=LAB_PISTOL_PREVIEW_SCALE;
 // The authored primary socket is near the grip heel. A block hand
 // centered there cannot reach the trigger guard. Raise and move its palm
 // toward the beavertail/trigger while leaving source art unchanged.
 const triggerPalm={x:grip.x+1.05,y:grip.y+.72,z:grip.z};
 const contact:LabPistolContacts={
  // The held mesh's local origin is the HOLSTER pivot, not the firing grip.
  // Align the gun's upper firing grip/trigger finger to the solved wrist.
  primaryFromPivot:{
   x:triggerPalm.x-sockets.holsterPivot.x,
   y:triggerPalm.y-sockets.holsterPivot.y,
   z:triggerPalm.z-sockets.holsterPivot.z
  },
  // Put the support palm around the *front* of the firing grip. Previous
  // offset used '-.7' X and sat behind the trigger wrist, reading like a
  // dangling second fist rather than a wrapped two-handed grip.
  supportOffset:{
   x:(sockets.supportGrip.x-triggerPalm.x)*scale+2.55,
   y:(sockets.supportGrip.y-triggerPalm.y)*scale-.16,
   z:(sockets.supportGrip.z-triggerPalm.z)*scale-2.42
  },
  // Slide overhand anchor follows the actual G19/G26/M9 upper rear slide.
  slideOffset:{
   x:(sockets.slideGrip.x-triggerPalm.x)*scale,
   y:(sockets.slideGrip.y-triggerPalm.y)*scale+.1,
   z:-1.15
  }
 };
 cached.set(id,contact);
 return contact;
}
