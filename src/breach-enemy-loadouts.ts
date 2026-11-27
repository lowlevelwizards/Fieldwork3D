/** Fixed visual/equipment identities for seeded hostile encounter roles.
 * The AI's EncounterRole/weaponProfile remains authoritative; this layer
 * assigns rendered model, protection and carried rig, never tactical behavior.
 * Do not use Math.random: identical encounters must reproduce in replay. */
import type {EncounterActorSpec,EncounterRole} from './worldgen/encounter-types.ts';
import {issueWeaponPreset} from './breach-weapon-issue.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from './equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import {initialFieldInventory} from './equipment-field-inventory.ts';
import {selectWardrobeItem} from './operator-wardrobe-unified.ts';
import {setWardrobeFabricSolid,resolvedWardrobe,matchWardrobeUniformCamo,type WardrobeSlot} from './operator-wardrobe-data.ts';
import {ENEMY_OUTFIT_PROFILES,outfitPick,outfitRoll} from './breach-enemy-outfit-profiles.ts';
import type {AiGroupKind} from './breach-ai-group-profiles.ts';
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
 seed:number,index:number,group?:{kind:AiGroupKind;id:string}){
 if(group)return groupEnemyKit(spec,seed,index,group);
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

/** Group profile is the authority; role never grants a special uniform or
 * protection automatically. Identical group seed selects coherent issue. */
function groupEnemyKit(spec:Pick<EncounterActorSpec,'role'|'weaponProfile'>|undefined,
 seed:number,index:number,group:{kind:AiGroupKind;id:string}){
 const profile=ENEMY_OUTFIT_PROFILES[group.kind],person=group.id+'/'+index;
 const shared=profile.coherent?group.id:person;
 const pick=<T>(items:readonly T[],channel:string,key=person)=>outfitPick(items,seed,key,channel);
 const issue=issueWeaponPreset(pick(profile.weapons,'weapon',shared));
 let equipment=initialEquipmentLoadout(issue.weapon);
 let wardrobe=initialWardrobe();
 const headwear=pick(profile.headwear,'head',shared);
 const light=group.kind==='opportunists'||group.kind==='fugitives'||group.kind==='organised-criminals';
 const armored=!light||group.kind==='organised-criminals'&&outfitRoll(seed,person,'armor')<.45;
 const styles:Partial<Record<WardrobeSlot,string>>={
  headwear,top:pick(profile.tops,'top',shared),trousers:pick(profile.trousers,'legs',shared),
  armorStyle:armored?profile.armorStyle:'armor-bare',
  rigStyle:armored?profile.rigStyle:'no-rig',beltStyle:profile.belt,packStyle:profile.pack,
  gloves:light||group.kind==='security'?'gloves-none':'gloves-field',
  footwear:light?'sneakers':'field-boots',headset:group.kind==='specialists'?'boom-headset':'comms-none'
 };
 for(const [slot,id] of Object.entries(styles)){
  const choice=selectWardrobeItem(equipment,wardrobe,slot as WardrobeSlot,id);
  equipment=choice.kit;wardrobe=choice.wardrobe;
 }
 for(const [slot,id] of [['medical','medical-none'],['tactical','tactical-none'],['utility','utility-none']] as const)
  equipment=setEquipmentChoice(equipment,slot,id);
 equipment={...equipment,fieldInventory:initialFieldInventory(equipment)};
 wardrobe={...wardrobe,trouserHem:light||group.kind==='security'?'unbloused':'bloused'};
 const looks=resolvedWardrobe(wardrobe,equipment);
 wardrobe=setWardrobeFabricSolid(wardrobe,'top',pick(profile.topColors,'top-color',shared),looks);
 wardrobe=setWardrobeFabricSolid(wardrobe,'trousers',pick(profile.trouserColors,'leg-color',shared),looks);
 // Shared uniform print uses the approved compatibility matrix.
 // Group issue, never individual training, owns palette and silhouette.
 const kind=group.kind;
 if(kind==='regular-force'||kind==='specialists'){
  const camo=kind==='regular-force'?
    pick(['scorpion-w2','russian-emr','multicam'] as const,'uniform-print',group.id):
    pick(['multicam','multicam-black'] as const,'uniform-print',group.id);
  wardrobe=matchWardrobeUniformCamo(wardrobe,looks,camo);
  wardrobe={...wardrobe,headwearColor:kind==='regular-force'?'olive-drab':'black'};
 }else if(kind==='security'){
  wardrobe={...wardrobe,headwearColor:'navy'};
  wardrobe=setWardrobeFabricSolid(wardrobe,'armor','black',looks);
 }else if(kind==='organised-criminals'){
  wardrobe={...wardrobe,headwearColor:'black'};
  if(looks.top==='button-up-shirt'&&outfitRoll(seed,person,'flannel')<.4)
    wardrobe={...wardrobe,topColorway:'flannel-gray'};
 }else if(kind==='opportunists'&&looks.top==='button-up-shirt'){
  wardrobe={...wardrobe,topColorway:pick(['flannel-rust-red','flannel-blue','flannel-green'] as const,'flannel')};
 }
 const integrity=initialArmorIntegrity(equipment);
 return {...issue,role:spec?.role??'occupant',equipment,wardrobe,
  appearanceSeed:((seed>>>0)^Math.imul(index+1,0x9e3779b1))>>>0,
  armorIntegrity:integrity.torso,helmetIntegrity:integrity.head};
}
