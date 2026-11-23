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
 const contact:LabPistolContacts={
  // The held mesh's local origin is the HOLSTER pivot, not the firing grip.
  // Align the mesh's actual trigger-hand artwork to the solved wrist.
  primaryFromPivot:{
   x:grip.x-sockets.holsterPivot.x,
   y:grip.y-sockets.holsterPivot.y,
   z:grip.z-sockets.holsterPivot.z
  },
  // Meet the off-hand at the weapon grip (not the shoulder-fired rifle's
  // handguard). A little inward/behind is the palm thickness allowance.
  supportOffset:{
   x:(sockets.supportGrip.x-grip.x)*scale-.7,
   y:(sockets.supportGrip.y-grip.y)*scale-.16,
   z:-.8-Math.min(.3,Math.abs(sockets.supportGrip.z-grip.z)*scale*.25)
  },
  // Slide overhand anchor follows the actual G19/G26/M9 upper rear slide.
  slideOffset:{
   x:(sockets.slideGrip.x-grip.x)*scale,
   y:(sockets.slideGrip.y-grip.y)*scale+.1,
   z:-1.15
  }
 };
 cached.set(id,contact);
 return contact;
}
