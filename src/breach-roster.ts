/** LW-15: versioned, bounded individual operator records.
 * Save state belongs to operations, never to the 60Hz world simulation.
 */
import type {Session} from './breach-game.ts';
import {WEAPONS,type WeaponId} from './breach-combat.ts';
import {initialArmorIntegrity} from './equipment-armor.ts';
import {magazineKit,type MagazineItem} from './breach-magazines.ts';
import {readPersistentMagazines,readLoadedMagazineId,addReserveRounds}
 from './equipment-magazine-persistence.ts';
import {stageMagazines,magazineSpace,type MagazineLocation}
 from './equipment-magazine-placement.ts';
import {kitMedicalSupplies} from './equipment-medical-supplies.ts';
import {issuedWedges} from './equipment-entry-tools.ts';
import {initialWeaponConfiguration,readWeaponConfiguration,changeWeaponPlatform,
 setWeaponAttachment,type WeaponConfiguration,type WeaponAttachmentSlot}
 from './equipment-weapon-assemblies.ts';
import {equippedFlashCharges,
 initialEquipmentLoadout,readEquipmentLoadout,syncPrimaryWeapon,setEquipmentChoice,
 loadMovementScale,type EquipmentLoadout,type LoadoutSlot} from './equipment-loadouts.ts';
export type RosterMember={
 id:string;callsign:string;missions:number;successful:number;
 injuries:number;recovery:number;weapon:WeaponId;magazine:number;reserve:number;
 fired:number;appearanceSeed:number;loadout:EquipmentLoadout;
 magazines:MagazineItem[];loadedMagazineId:string;
 weaponConfiguration:WeaponConfiguration;
};
export type RosterState={version:1;members:RosterMember[]};
const names=['rook','moss','ash','vale'] as const;
const weapons:WeaponId[]=['carbine','smg','rifle','shotgun'];
const defaultMember=(id:string,i:number):RosterMember=>({
 id,callsign:id.toUpperCase(),missions:0,successful:0,
 injuries:0,recovery:0,weapon:weapons[i],
 magazine:WEAPONS[weapons[i]].capacity,reserve:WEAPONS[weapons[i]].reserve,
 fired:0,appearanceSeed:i+1,
 loadout:initialEquipmentLoadout(weapons[i]),
 weaponConfiguration:initialWeaponConfiguration(weapons[i]),
 magazines:weapons[i]==='shotgun'?[]:
  magazineKit(id,weapons[i],WEAPONS[weapons[i]].reserve,WEAPONS[weapons[i]].capacity),
 loadedMagazineId:id+'/'+weapons[i]+'/loaded'
});
export function initialRoster():RosterState{
 return {version:1,members:names.map((id,i)=>defaultMember(id,i))};
}
const finite=(x:unknown,min:number,max:number,fallback:number)=>
 typeof x==='number'&&Number.isFinite(x)?
 Math.max(min,Math.min(max,Math.floor(x))):fallback;
export function readRoster(raw:string|null):RosterState{
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
   const reserve=finite(f.reserve,0,300,base.reserve);
   const magazines=readPersistentMagazines(base.id,weapon,reserve,f.magazines);
   return {...base,callsign:typeof f.callsign==='string'&&f.callsign.trim()?
     f.callsign.trim().slice(0,24):base.callsign,
    appearanceSeed:finite(f.appearanceSeed,0,0xffffffff,base.appearanceSeed),
    loadout:readEquipmentLoadout(f.loadout,weapon),
    weaponConfiguration:readWeaponConfiguration(f.weaponConfiguration,weapon),
    magazines,loadedMagazineId:readLoadedMagazineId(base.id,weapon,
     f.loadedMagazineId,magazines),
    missions:finite(f.missions,0,100000,0),
    successful:finite(f.successful,0,100000,0),
    injuries:finite(f.injuries,0,3,0),
    recovery:finite(f.recovery,0,12,0),
    weapon:weapons.includes(f.weapon as WeaponId)?
       f.weapon as WeaponId:base.weapon,
    magazine:finite(f.magazine,0,WEAPONS[f.weapon??base.weapon]?.capacity??36,
      base.magazine),
    reserve,
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
    return prior?{...base,callsign:prior.callsign,appearanceSeed:prior.appearanceSeed}:base;
  })};
}
/** Cosmetic preferences are the only Quick Play operator data stored on disk. */
export function serializeQuickPlayCosmetics(roster:RosterState):string{
  return JSON.stringify({version:1,members:roster.members.map(m=>({
    id:m.id,callsign:m.callsign,appearanceSeed:m.appearanceSeed
  }))});
}
export function applyRosterIdentity(s:Session,roster:RosterState){
 for(const a of s.operators){
  if(a.side!=='blue')continue;
  const member=roster.members.find(m=>m.id===a.id);
  if(member){
   a.name=member.callsign;
   a.appearanceSeed=member.appearanceSeed;
   a.equipment=member.loadout;
    a.weaponConfiguration=member.weaponConfiguration;
    a.medicalSupplies=kitMedicalSupplies(member.loadout);
    a.wedgeRemaining=issuedWedges(member.loadout);
    a.weaponLightOn=member.weaponConfiguration.slots.light==='light-compact';
   a.flashCharges=equippedFlashCharges(member.loadout);
   const protection=initialArmorIntegrity(member.loadout);
   a.armorIntegrity=protection.torso;a.helmetIntegrity=protection.head;
   a.loadMovementScale=loadMovementScale(member.loadout,member.weaponConfiguration);
   a.weapon=member.weapon;
   a.magazine=Math.min(WEAPONS[a.weapon].capacity,member.magazine);
   a.reserve=member.reserve;
   a.insertedMagazineId=member.loadedMagazineId;
   a.spareMagazines=a.weapon==='shotgun'?[]:
      stageMagazines(member.magazines,member.loadout);
   a.reload=0;a.reloadMode=null;
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
 s.flashRemaining=Math.min(2,s.operators.filter(a=>a.side==='blue')
  .reduce((n,a)=>n+a.flashCharges,0));
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
     actor.spareMagazines),
    loadedMagazineId:readLoadedMagazineId(m.id,actor.weapon,
     actor.insertedMagazineId,actor.spareMagazines)};
 })};
}

/** Explicit between-mission resupply: no hidden refill or weapon swap. */
export function resupplyRoster(roster:RosterState,id?:string):RosterState{
 return {version:1,members:roster.members.map(m=>
  id!==undefined&&m.id!==id?{...m}:{
   ...m,magazine:WEAPONS[m.weapon].capacity,
   reserve:Math.max(m.reserve,WEAPONS[m.weapon].reserve),
   magazines:addReserveRounds(m.id,m.weapon,m.magazines,
    Math.max(0,WEAPONS[m.weapon].reserve-m.reserve))
  })};
}
/** Pre-mission equipment swap with coherent ammunition, not just HUD text. */
export function equipRoster(roster:RosterState,id:string,weapon:WeaponId):RosterState{
 return {version:1,members:roster.members.map(m=>m.id===id?{
   ...m,weapon,loadout:syncPrimaryWeapon(m.loadout,weapon),
    weaponConfiguration:changeWeaponPlatform(m.weaponConfiguration,weapon),
   magazine:WEAPONS[weapon].capacity,reserve:WEAPONS[weapon].reserve,
   magazines:weapon==='shotgun'?[]:
    magazineKit(m.id,weapon,WEAPONS[weapon].reserve,WEAPONS[weapon].capacity),
   loadedMagazineId:m.id+'/'+weapon+'/loaded'
  }:{...m})};
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
 const moved=stageMagazines(placed.map(m=>m.id===magazineId?
  {...m,location:to}:m),member.loadout);
 return {...roster,members:roster.members.map(m=>m.id===id?
  {...m,magazines:moved}:m)};
}
