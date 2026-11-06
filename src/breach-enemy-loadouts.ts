/** Fixed visual/equipment identities for seeded hostile encounter roles.
 * The AI's EncounterRole/weaponProfile remains authoritative; this layer
 * assigns rendered model, protection and carried rig, never tactical behavior.
 * Do not use Math.random: identical encounters must reproduce in replay. */
import type {EncounterActorSpec,EncounterRole} from './worldgen/encounter-types.ts';
import {issueWeaponPreset} from './breach-weapon-issue.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from './equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';

type ArchetypeKit={preset:string;armor:'armor-none'|'armor-soft'|'armor-carrier';
 rig:'rig-none'|'rig-light'|'rig-full';head:'head-none'|'head-cap'|'head-helmet';
 armorStyle:string;rigStyle:string;headwear:string;top:string;trousers:string};
const KITS:Readonly<Record<EncounterRole,ArchetypeKit>>={
 occupant:{preset:'ak-akm',armor:'armor-none',rig:'rig-none',head:'head-none',
  armorStyle:'armor-bare',rigStyle:'no-rig',headwear:'bare',
  top:'bdu-shirt',trousers:'bdu-trousers'},
 sentry:{preset:'ak-ak74',armor:'armor-soft',rig:'rig-light',head:'head-cap',
  armorStyle:'soft-flak',rigStyle:'chicom-rig',headwear:'patrol-cap',
  top:'bdu-shirt',trousers:'bdu-trousers'},
 lookout:{preset:'ar-car15',armor:'armor-none',rig:'rig-light',head:'head-cap',
  armorStyle:'armor-bare',rigStyle:'chicom-rig',headwear:'patrol-cap',
  top:'bdu-shirt',trousers:'bdu-trousers'},
 patrol:{preset:'ak-ak105',armor:'armor-soft',rig:'rig-light',head:'head-helmet',
  armorStyle:'soft-flak',rigStyle:'light-rig',headwear:'ach',
  top:'acu-shirt',trousers:'acu-trousers'},
 investigator:{preset:'ar-m4a1',armor:'armor-soft',rig:'rig-light',head:'head-cap',
  armorStyle:'soft-flak',rigStyle:'light-rig',headwear:'patrol-cap',
  top:'bdu-shirt',trousers:'bdu-trousers'},
 reserve:{preset:'ak-ak74m',armor:'armor-carrier',rig:'rig-full',head:'head-helmet',
  armorStyle:'plate-standard',rigStyle:'field-webbing',headwear:'ach',
  top:'acu-shirt',trousers:'acu-trousers'},
 leader:{preset:'ar-m4a1',armor:'armor-carrier',rig:'rig-full',head:'head-helmet',
  armorStyle:'plate-standard',rigStyle:'full-chest',headwear:'high-cut',
  top:'acu-shirt',trousers:'acu-trousers'},
 target:{preset:'ak-aks74u',armor:'armor-none',rig:'rig-none',head:'head-none',
  armorStyle:'armor-bare',rigStyle:'no-rig',headwear:'bare',
  top:'bdu-shirt',trousers:'bdu-trousers'}
};
export function enemyKitForEncounter(spec:Pick<EncounterActorSpec,'role'|'weaponProfile'>|undefined,
 seed:number,index:number){
 const role=spec?.role??(['sentry','occupant','patrol','lookout','reserve'] as const)[index%5];
 const base=KITS[role];
 // A prepared/security posting upgrades the *equipment*, not the AI role.
 const prepared=spec?.weaponProfile==='prepared';
 const security=spec?.weaponProfile==='security';
 const preset=prepared&&role==='sentry'?'ak-ak74m':
  security&&role==='occupant'?'ar-m4a1':base.preset;
 const issue=issueWeaponPreset(preset);
 const armor=prepared&&base.armor==='armor-none'?'armor-soft':base.armor;
 const rig=prepared&&base.rig==='rig-none'?'rig-light':base.rig;
 let equipment=initialEquipmentLoadout(issue.weapon);
 for(const [slot,id] of [['armor',armor],['rig',rig],['head',base.head]] as const)
  equipment=setEquipmentChoice(equipment,slot,id);
 let wardrobe:WardrobeOptions=initialWardrobe();
 for(const [slot,id] of Object.entries({
  armorStyle:armor==='armor-soft'?'soft-flak':base.armorStyle,
  rigStyle:rig==='rig-light'&&base.rig==='rig-none'?'light-rig':base.rigStyle,
  headwear:base.headwear,top:base.top,trousers:base.trousers
 }))wardrobe=setWardrobeStyle(wardrobe,slot as 'armorStyle'|'rigStyle'|'headwear'|'top'|'trousers',id);
 const integrity=initialArmorIntegrity(equipment);
 const appearanceSeed=((seed>>>0)^Math.imul(index+1,0x9e3779b1))>>>0;
 return {...issue,role,equipment,wardrobe,appearanceSeed,
  armorIntegrity:integrity.torso,helmetIntegrity:integrity.head};
}
