/** D4.0: give each Dispatch pilot recruit the same supported kit as the
 * initial SWAT team, without editing personal skill/identity or career data.
 * Existing visual reference remains the single authored appearance source.
 */
import type {CampaignOperator} from './campaign-state.ts';
import {resolveFactionReference} from './faction-reference-resolver.ts';
import {DISPATCH_PILOT_REFERENCE_ID} from './dispatch-content-foundation.ts';
import {issueWeaponPreset} from './breach-weapon-issue.ts';
import {freshMagazineIssue} from './arsenal/live-magazine-capacity.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {kitMedicalSupplies} from './equipment-medical-supplies.ts';
import {readEquipmentLoadout} from './equipment-loadouts.ts';
import {readWardrobe} from './operator-wardrobe-data.ts';

export function issueDispatchPilotOperator(person:CampaignOperator,
 referenceId:string=DISPATCH_PILOT_REFERENCE_ID):CampaignOperator{
 const appearance=resolveFactionReference(referenceId);
 if(appearance.technicalIssues.length)throw Error(
  'Dispatch starter appearance has invalid equipment: '+
  appearance.technicalIssues.join(', '));
 const {weapon,weaponConfiguration}=issueWeaponPreset(appearance.weapon.presetId);
 if(appearance.kit.slots.primary!=='primary-'+weapon)
  throw Error('Dispatch starter weapon and equipment class mismatch');
 const loadout=readEquipmentLoadout({version:1,slots:{...appearance.kit.slots}},weapon,person.id);
 const wardrobe=readWardrobe({...appearance.wardrobe,
  skinTone:person.wardrobe?.skinTone,
  hairStyle:person.wardrobe?.hairStyle,hairTone:person.wardrobe?.hairTone});
 return {...person,background:'Tactical Police',weapon,weaponConfiguration,
  weaponSerialId:null,...freshMagazineIssue(person.id,weapon,weaponConfiguration),
  wardrobe,loadout,armorCondition:initialArmorIntegrity(loadout),
  medicalSupplies:kitMedicalSupplies(loadout)};
}
