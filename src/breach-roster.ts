import {quoteUnifiedPreparation,quoteSavedSquadCarryMigration} from './equipment-unified-preparation.ts';
/** LW-15: versioned, bounded individual operator records.
 * Save state belongs to operations, never to the 60Hz world simulation.
 */
import type {Session} from './breach-game.ts';
import {initialWardrobe,readWardrobe,type WardrobeOptions}
 from './operator-wardrobe-data.ts';
import type {WeaponId} from './breach-combat.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {applyDeploymentInventory} from './equipment-deployment-snapshot.ts';
import type {MagazineItem} from './breach-magazines.ts';
import {liveMagazineCapacity,standardReserveRounds,freshMagazineIssue,
 fitMagazineInventory} from './arsenal/live-magazine-capacity.ts';
import {readPersistentMagazines,readLoadedMagazineId,addReserveRounds}
 from './equipment-magazine-persistence.ts';
import {quoteOneMagazineMove} from './equipment-magazine-transfer.ts';
import {quoteCarryGearChange,type CarryGearSlot} from './equipment-carry-gear-change.ts';
import {captureCarryUndo,quoteCarryUndo,type CarryUndoSnapshot} from './equipment-carry-undo.ts';
import {quoteCarryLayoutCopy} from './equipment-carry-layout-copy.ts';
import {stageMagazines,magazineSpace,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {initialFieldInventory,readFieldInventory,fieldCarryReport,type FieldInventory} from './equipment-field-inventory.ts';
import {readWeaponConfiguration,changeWeaponPlatform,
 setWeaponAttachment,selectWeaponFamilyPreset,setConfiguredFamilyPart,
 type WeaponConfiguration,type WeaponAttachmentSlot}
 from './equipment-weapon-assemblies.ts';
import {familyPreset,matchingFamilyPreset,type FamilyPartSlot} from './equipment-weapon-families.ts';
import {issueStarterWeapon,starterWeaponPreset,resolveCatalogConfiguration} from './breach-weapon-issue.ts';
import {initialEquipmentLoadout,readEquipmentLoadout,syncPrimaryWeapon,setEquipmentChoice,
 type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
export type RosterMember={
 id:string;callsign:string;missions:number;successful:number;
 injuries:number;recovery:number;weapon:WeaponId;magazine:number;reserve:number;
 fired:number;appearanceSeed:number;loadout:EquipmentLoadout;
 wardrobe:WardrobeOptions;
 magazines:MagazineItem[];loadedMagazineId:string;
 weaponConfiguration:WeaponConfiguration;
};
export type RosterState={version:1;members:RosterMember[]};
const names=['rook','moss','ash','vale'] as const;
const weapons:WeaponId[]=['carbine','smg','rifle','shotgun'];
const defaultMember=(id:string,i:number):RosterMember=>{
 const issue=issueStarterWeapon(id);
 const ammo=freshMagazineIssue(id,issue.weapon,issue.weaponConfiguration);
 return {
  id,callsign:id.toUpperCase(),missions:0,successful:0,
  injuries:0,recovery:0,weapon:issue.weapon,
  magazine:ammo.magazine,reserve:ammo.reserve,
  fired:0,appearanceSeed:i+1,wardrobe:initialWardrobe(),
  loadout:initialEquipmentLoadout(issue.weapon),
  weaponConfiguration:issue.weaponConfiguration,
  magazines:ammo.magazines,
  loadedMagazineId:ammo.loadedMagazineId
 };
};
export function initialRoster():RosterState{
 return {version:1,members:names.map((id,i)=>defaultMember(id,i))};
}
const finite=(x:unknown,min:number,max:number,fallback:number)=>
 typeof x==='number'&&Number.isFinite(x)?
 Math.max(min,Math.min(max,Math.floor(x))):fallback;
export function readRoster(raw:string|null,carryMode?:'unified'):RosterState{
 const fresh=initialRoster();
 if(!raw)return fresh;
 try{
  const value:unknown=JSON.parse(raw);
  if(!value||typeof value!=='object')return fresh;
  const data=value as {version?:unknown;members?:unknown};
  if(data.version!==1||!Array.isArray(data.members))return fresh;
  const savedMembers=data.members;
  return {version:1,members:fresh.members.map(base=>{
   const found=savedMembers.find((v:unknown)=>
     !!v&&typeof v==='object'&&'id' in v&&v.id===base.id);
   if(!found||typeof found!=='object')return base;
   const f=found as Partial<RosterMember>;
   const weapon=weapons.includes(f.weapon as WeaponId)?
     f.weapon as WeaponId:base.weapon;
   const config=resolveCatalogConfiguration(
    readWeaponConfiguration(f.weaponConfiguration,weapon),weapon,
    starterWeaponPreset(base.id));
   const reserve=finite(f.reserve,0,300,base.reserve);
   const parsed=readPersistentMagazines(base.id,weapon,reserve,f.magazines,
    300);
   const fitted=fitMagazineInventory(base.id,weapon,config,
    finite(f.magazine,0,300,base.magazine),reserve,parsed);
   const magazines=fitted.magazines;
   return {...base,callsign:typeof f.callsign==='string'&&f.callsign.trim()?
     f.callsign.trim().slice(0,24):base.callsign,
    appearanceSeed:finite(f.appearanceSeed,0,0xffffffff,base.appearanceSeed),
    loadout:readEquipmentLoadout(f.loadout,weapon,base.id,carryMode),
    wardrobe:readWardrobe(f.wardrobe),
    weaponConfiguration:config,
    magazines,loadedMagazineId:readLoadedMagazineId(base.id,weapon,
     f.loadedMagazineId,magazines),
    missions:finite(f.missions,0,100000,0),
    successful:finite(f.successful,0,100000,0),
    injuries:finite(f.injuries,0,3,0),
    recovery:finite(f.recovery,0,12,0),
    weapon:weapons.includes(f.weapon as WeaponId)?
       f.weapon as WeaponId:base.weapon,
    magazine:fitted.magazine,
    reserve:fitted.reserve,
    fired:finite(f.fired,0,1000000,0)};
  })};
 }catch{return fresh;}
}
/** Quick Play never carries combat state between rounds. Keep only player-
 * chosen names and appearance; weapons, kit, wounds, ammo, and magazines
 * always begin from an untouched standard roster. */
export function freshQuickPlayRoster(previous:RosterState=initialRoster()):RosterState{
  const fresh=initialRoster();
  return {version:1,members:fresh.members.map(base=>{
    const prior=previous.members.find(m=>m.id===base.id);
    return prior?{...base,callsign:prior.callsign,
      appearanceSeed:prior.appearanceSeed,wardrobe:readWardrobe(prior.wardrobe)}:base;
  })};
}
/** Cosmetic preferences are the only Quick Play operator data stored on disk. */
export function serializeQuickPlayCosmetics(roster:RosterState):string{
  return JSON.stringify({version:1,members:roster.members.map(m=>({
    id:m.id,callsign:m.callsign,appearanceSeed:m.appearanceSeed,
    wardrobe:readWardrobe(m.wardrobe)
  }))});
}
export function applyRosterIdentity(s:Session,roster:RosterState){
 for(const a of s.operators){
  if(a.side!=='blue')continue;
  const member=roster.members.find(m=>m.id===a.id);
  if(member){
   a.name=member.callsign;
   a.appearanceSeed=member.appearanceSeed;
   a.wardrobe=member.wardrobe;
   applyDeploymentInventory(a,member);
   const protection=initialArmorIntegrity(member.loadout);
   a.armorIntegrity=protection.torso;a.helmetIntegrity=protection.head;
   // Persistent wounds affect readiness but never invent fresh fatal damage.
   if(member.recovery>0&&member.injuries>0){
    const stage=Math.min(2,member.injuries);
    a.injuryStage=Math.max(a.injuryStage,stage);
    a.health=Math.min(a.health,4-stage);
   }
  }
 }
 reconcileSquadFlashes(s);
}
/** Keep the existing mission-wide device budget, but never display usable
 * devices when nobody actually carries one. */
export function reconcileSquadFlashes(s:Session){
 if(s.started)return;
 s.flashRemaining=s.operators.filter(a=>a.side==='blue')
  .reduce((n,a)=>n+a.flashCharges,0);
}
export function recordRosterMission(s:Session,roster:RosterState):RosterState{
 return {version:1,members:roster.members.map(m=>{
  const actor=s.operators.find(a=>a.id===m.id&&a.side==='blue');
  if(!actor)return {...m};
  const fresh=actor.health<=0?2:Math.min(2,actor.injuryStage);
  // Recovery advances one mission between major injuries, and an operator
  // wounded again receives the appropriate new recovery duration.
  const rest=Math.max(0,m.recovery-1);
  const recovery=fresh>0?Math.max(rest,fresh*2):rest;
  const injuries=fresh>0?Math.max(fresh,m.injuries):
    recovery===0?0:m.injuries;
  return {...m,missions:m.missions+1,
    successful:m.successful+(s.phase==='won'?1:0),
    injuries,recovery,fired:m.fired+actor.shots,
    weapon:actor.weapon,loadout:syncPrimaryWeapon(m.loadout,actor.weapon),
    weaponConfiguration:changeWeaponPlatform(m.weaponConfiguration,actor.weapon),
    magazine:actor.magazine,reserve:actor.reserve,
    magazines:readPersistentMagazines(m.id,actor.weapon,actor.reserve,
     actor.spareMagazines,liveMagazineCapacity(actor.weapon,actor.weaponConfiguration)),
    loadedMagazineId:readLoadedMagazineId(m.id,actor.weapon,
     actor.insertedMagazineId,actor.spareMagazines)};
 })};
}

/** Explicit between-mission resupply: no hidden refill or weapon swap. */
export function resupplyRoster(roster:RosterState,id?:string):RosterState{
 return {version:1,members:roster.members.map(m=>{
  if(id!==undefined&&m.id!==id)return {...m};
  const cap=liveMagazineCapacity(m.weapon,m.weaponConfiguration);
  const target=standardReserveRounds(m.weapon,m.weaponConfiguration);
  const extra=Math.max(0,target-m.reserve);
  return {...m,magazine:cap,reserve:m.reserve+extra,
   magazines:addReserveRounds(m.id,m.weapon,m.magazines,extra,cap)};
 })};
}
/** Pre-mission equipment swap with coherent ammunition, not just HUD text. */
export function equipRoster(roster:RosterState,id:string,weapon:WeaponId):RosterState{
 return {version:1,members:roster.members.map(m=>{
  if(m.id!==id)return {...m};
  const config=resolveCatalogConfiguration(
   changeWeaponPlatform(m.weaponConfiguration,weapon),weapon,
   starterWeaponPreset(m.id));
  return {...m,weapon,loadout:syncPrimaryWeapon(m.loadout,weapon),
   weaponConfiguration:config,...freshMagazineIssue(m.id,weapon,config)};
 })};
}

/** Quick play has unlimited equipment availability, but each individual
 * soldier still has an independent, persistent and compatible configuration. */
export function equipRosterGear(roster:RosterState,id:string,slot:LoadoutSlot,
 itemId:string):RosterState{
 if(slot==='primary')return roster;
 const member=roster.members.find(m=>m.id===id);
 if(!member)return roster;
 const next=setEquipmentChoice(member.loadout,slot,itemId);
 if(next===member.loadout)return roster;
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,loadout:next,magazines:stageMagazines(m.magazines,next)}:m)};
}
/** Explicit, single-commit carry gear swap used by live preparation UI.
 * The legacy generic gear selector remains for other equipment slots.
 */
export function equipRosterCarryGear(roster:RosterState,id:string,
 slot:CarryGearSlot,itemId:string,carryMode?:'unified'):RosterState{
 const member=roster.members.find(m=>m.id===id);
 if(!member)return roster;
 const quote=carryMode==='unified'?quoteUnifiedPreparation(member,{kind:'gear',slot,id:itemId}):quoteCarryGearChange(member.loadout,member.magazines,slot,itemId);
 if(!quote.ok)return roster;
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,loadout:quote.kit,magazines:quote.magazines}:m)};
}
/** Restore the exact physical carry snapshot only if it is still current.
 * The caller may show an Undo button, but this owner has final authority.
 */
export function undoRosterCarryGear(roster:RosterState,id:string,
 expected:CarryUndoSnapshot,before:CarryUndoSnapshot,carryMode?:'unified'):RosterState{
 const member=roster.members.find(m=>m.id===id);
 if(!member)return roster;
 const current=captureCarryUndo(member.loadout,member.magazines);
 if(JSON.stringify(current)!==JSON.stringify(expected))return roster;
 const quote=quoteCarryUndo(current,before,carryMode==='unified'?member:undefined);
 if(!quote.ok)return roster;
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,loadout:quote.restore.loadout,magazines:quote.restore.magazines}:m)};
}
/** Copy only compatible physical magazine/gadget positions. Each recipient
 * keeps every owned magazine, ammo round, wearable item and issued unit.
 */
export function copyRosterCarryLayout(roster:RosterState,
 sourceId:string,targetId:string,carryMode?:'unified'):RosterState{
 if(carryMode==='unified'||sourceId===targetId)return roster;
 const source=roster.members.find(m=>m.id===sourceId);
 const target=roster.members.find(m=>m.id===targetId);
 if(!source||!target)return roster;
 const quote=quoteCarryLayoutCopy(source.loadout,source.magazines,
  target.loadout,target.magazines);
 if(!quote.ok||!quote.changed)return roster;
 return {...roster,members:roster.members.map(m=>m.id===targetId?
  {...m,loadout:quote.loadout,magazines:quote.magazines}:m)};
}
/** L2.1: atomically issue an operator's physical field kit.
 * The authoring UI validates capacity before calling this pathway.
 */
export function equipRosterFieldInventory(roster:RosterState,id:string,
 inventory:FieldInventory,carryMode?:'unified'):RosterState{
 const member=roster.members.find(m=>m.id===id);if(!member)return roster;
 if(carryMode==='unified'){
  const q=quoteUnifiedPreparation(member,{kind:'field',inventory});
  if(!q.ok)return roster;
  return {...roster,members:roster.members.map(m=>m.id===id?{...m,loadout:q.kit,magazines:q.magazines}:m)};
 }
 const next=readFieldInventory(inventory,member.loadout);
 if(!fieldCarryReport(member.loadout,member.magazines,next).valid)return roster;
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,loadout:{...m.loadout,fieldInventory:next}}:m)};
}

/** Quick Play permits selecting compatible parts between missions. */
export function configureRosterWeapon(roster:RosterState,id:string,
 slot:WeaponAttachmentSlot,partId:string):RosterState{
 const m=roster.members.find(m=>m.id===id);
 if(!m)return roster;
 const next=setWeaponAttachment(m.weaponConfiguration,slot,partId);
 if(next===m.weaponConfiguration)return roster;
 return {...roster,members:roster.members.map(member=>member.id===id?
  {...member,weaponConfiguration:next}:member)};
}
/** One named reference selection, independent of historical simulation category. */
export function equipRosterCatalogPreset(roster:RosterState,id:string,presetId:string):RosterState{
 const member=roster.members.find(m=>m.id===id),preset=familyPreset(presetId);
 if(!member||!preset)return roster;
 if(member.weaponConfiguration.build&&matchingFamilyPreset(member.weaponConfiguration.build)?.id===presetId)return roster;
 const base=member.weapon===preset.weapon?member.weaponConfiguration:changeWeaponPlatform(member.weaponConfiguration,preset.weapon);
 const config=selectWeaponFamilyPreset(base,presetId);
 if(!config.build||matchingFamilyPreset(config.build)?.id!==presetId)return roster;
 return {...roster,members:roster.members.map(m=>m.id===id?{...m,
  weapon:preset.weapon,weaponConfiguration:config,loadout:syncPrimaryWeapon(m.loadout,preset.weapon),
  ...freshMagazineIssue(m.id,preset.weapon,config)}:m)};
}
/** Historical same-category recipe edit API. */
export function configureRosterWeaponPreset(roster:RosterState,id:string,
 presetId:string):RosterState{
 const m=roster.members.find(member=>member.id===id);
 if(!m)return roster;
 const config=selectWeaponFamilyPreset(m.weaponConfiguration,presetId);
 if(config===m.weaponConfiguration||config.build===m.weaponConfiguration.build)return roster;
 return {...roster,members:roster.members.map(member=>member.id===id?
  {...member,weaponConfiguration:config,
   ...freshMagazineIssue(member.id,member.weapon,config)}:member)};
}
/** Changing model furniture never changes physical weapon ownership or ammunition. */
export function configureRosterWeaponBodyPart(roster:RosterState,id:string,
 slot:FamilyPartSlot,partId:string):RosterState{
 const m=roster.members.find(member=>member.id===id);
 if(!m)return roster;
 const config=setConfiguredFamilyPart(m.weaponConfiguration,slot,partId);
 if(config===m.weaponConfiguration)return roster;
 return {...roster,members:roster.members.map(member=>member.id===id?
  {...member,weaponConfiguration:config,
   ...(slot==='magazine'?freshMagazineIssue(member.id,member.weapon,config):{})}:member)};
}
export function renameRosterMember(roster:RosterState,id:string,name:string):RosterState{
 const next=name.trim().slice(0,24);
 if(!next||roster.members.some(m=>m.id!==id&&m.callsign.toLowerCase()===next.toLowerCase()))
  return roster;
 return {...roster,members:roster.members.map(m=>m.id===id?{...m,callsign:next}:m)};
}
export function cycleRosterAppearance(roster:RosterState,id:string):RosterState{
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,appearanceSeed:(m.appearanceSeed+1)>>>0}:m)};
}

/** Quick Play manual pouch editing. No campaign costs or artificial limits
 * other than the actual carrying equipment's physical capacity. */
export function moveRosterMagazine(roster:RosterState,id:string,
 magazineId:string,to:MagazineLocation):RosterState{
 if(!['rig','belt','pocket','backpack','overflow'].includes(to))return roster;
 const member=roster.members.find(m=>m.id===id);
 if(!member||member.weapon==='shotgun')return roster;
 const placed=stageMagazines(member.magazines,member.loadout);
 const mag=placed.find(m=>m.id===magazineId);
 if(!mag||mag.location===to)return roster;
 const space=magazineSpace(member.loadout);
 if(to!=='overflow'&&placed.filter(m=>m.location===to).length>=space[to])return roster;
 // Validate within the roster authority as well as the UI; a single
 // placement must not displace magazines, field pieces or medical kits.
 let moved:MagazineItem[];
 if(to==='overflow'){
  moved=stageMagazines(placed.map(m=>m.id===magazineId?
   {...m,location:to}:m),member.loadout);
 }else{
  const quote=quoteOneMagazineMove(member.loadout,member.magazines,magazineId,to,
   member.loadout.fieldInventory??initialFieldInventory(member.loadout));
  if(!quote.ok||!quote.changed)return roster;
  moved=quote.magazines;
 }
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,magazines:moved}:m)};
}

/** Cosmetic Quick Play wardrobe preferences survive the next round, unlike
 * carried kit, wound state and magazines. No inventory is created here. */
export function setRosterWardrobe(roster:RosterState,id:string,raw:unknown):RosterState{
 if(!roster.members.some(m=>m.id===id))return roster;
 const wardrobe=readWardrobe(raw);
 return {...roster,members:roster.members.map(m=>m.id===id?{...m,wardrobe}:m)};
}

/** Explicit BT4 migration preflight. Hosts must surface any unfit operator
 * before switching a squad to the new runtime; no automatic stock repair. */
export function quoteRosterCarryMigration(roster:RosterState){
 const q=quoteSavedSquadCarryMigration(roster.members);
 return q.ok?{ok:true as const,roster:{...roster,members:q.members}}:q;
}
