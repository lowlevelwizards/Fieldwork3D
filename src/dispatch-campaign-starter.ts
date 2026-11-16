/** D3.2 narrow starting appearance for the SWAT pilot.
 * Existing reference visuals and actual game weapon models only.
 * This does not certify department issue or add a new playable firearm.
 */
import {newCampaign,type CampaignState} from './campaign-state.ts';
import {createCampaignRules} from './campaign-rules.ts';
import {resolveFactionReference} from './faction-reference-resolver.ts';
import {freshMagazineIssue} from './arsenal/live-magazine-capacity.ts';
import {issueWeaponPreset} from './breach-weapon-issue.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {kitMedicalSupplies} from './equipment-medical-supplies.ts';
import {reconcileCampaignWeaponOwnership} from './equipment-weapon-ownership.ts';
import {DISPATCH_PILOT_REFERENCE_ID} from './dispatch-content-foundation.ts';


export function newDispatchPilotCampaign(seed:number):CampaignState{
 const base=newCampaign(seed,createCampaignRules('dispatch'),'Dispatch SWAT Pilot');
 const appearance=resolveFactionReference(DISPATCH_PILOT_REFERENCE_ID);
 if(appearance.technicalIssues.length)
  throw Error('Dispatch starter appearance has invalid equipment: '+
   appearance.technicalIssues.join(', '));
 // Visual reference owns the preset ID, while issued gameplay weapon data
 // comes from the existing inventory/assembly authority.
 const {weapon,weaponConfiguration}=issueWeaponPreset(appearance.weapon.presetId);
 const operators=base.operators.map(person=>{
  const loadout={version:1 as const,slots:{...appearance.kit.slots}};
  return {...person,background:'Tactical Police',
   weapon,weaponConfiguration,weaponSerialId:null,
   ...freshMagazineIssue(person.id,weapon,weaponConfiguration),
   wardrobe:appearance.wardrobe,loadout,
   armorCondition:initialArmorIntegrity(loadout),
   medicalSupplies:kitMedicalSupplies(loadout)};
 });
 return reconcileCampaignWeaponOwnership({...base,operators});
}
