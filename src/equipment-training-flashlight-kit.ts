/** L1.4 unscored practice kit. Does not mutate Campaign roster,
 * purchase attachments, change firearms, or alter historical K1 trial IDs.
 * Training setup is the only caller; retry reissues the same deterministic kit.
 */
import type {Session} from './breach-game.ts';
import {setWeaponAttachment,weaponAttachmentAllowed}
 from './equipment-weapon-assemblies.ts';
import {fittedWeaponLight} from './equipment-weapon-light-operations.ts';
export function issuePracticeFlashlightKit(session:Session):number{
 if(!session.site?.training||session.site.trainingTrial)return 0;
 let issued=0;
 for(const actor of session.operators){
  if(actor.side!=='blue'||actor.health<=0||!actor.weaponConfiguration)continue;
  const config=actor.weaponConfiguration;
  if(!fittedWeaponLight(actor)&&
    !weaponAttachmentAllowed(config,'light','light-compact'))continue;
  if(!fittedWeaponLight(actor))
   actor.weaponConfiguration=setWeaponAttachment(config,'light','light-compact');
  if(!fittedWeaponLight(actor))continue;
  actor.weaponLightOn=false; // explicit light discipline on entering practice
  issued++;
 }
 return issued;
}
