/** L2.5 — Quick Play remembers equipment preferences, never combat stock.
 * Separate from the historical cosmetic-only persistence contract so older
 * standalone Operator Studio editors cannot erase the selected field kit.
 */
import {freshQuickPlayRoster,type RosterState} from './breach-roster.ts';
import {readEquipmentLoadout} from './equipment-loadouts.ts';
import {readWeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {resolveCatalogConfiguration,starterWeaponPreset} from './breach-weapon-issue.ts';
import {freshMagazineIssue} from './arsenal/live-magazine-capacity.ts';
import {stageMagazines,type MagazineLocation} from './equipment-magazine-placement.ts';
import type {WeaponId} from './breach-combat.ts';
const weapons:readonly WeaponId[]=['carbine','smg','rifle','shotgun'];
const validWeapon=(v:unknown):v is WeaponId=>
 typeof v==='string'&&weapons.includes(v as WeaponId);
const locations:readonly MagazineLocation[]=['rig','belt','backpack','pocket','overflow'];
const validLocation=(v:unknown):v is MagazineLocation=>
 typeof v==='string'&&locations.includes(v as MagazineLocation);
export type QuickPlayKitPreference={
 id:string;loadout:unknown;weaponConfiguration:unknown;
 magazineLocations:(MagazineLocation|null)[];
};
export function serializeQuickPlayKitPreferences(roster:RosterState):string{
 return JSON.stringify({version:2,members:roster.members.map(m=>({
  id:m.id,loadout:m.loadout,
  weaponConfiguration:resolveCatalogConfiguration(m.weaponConfiguration,m.weapon,starterWeaponPreset(m.id)),
  magazineLocations:m.magazines.map(m=>m.location??null)
 }))});
}
export function applyQuickPlayKitPreferences(
 roster:RosterState,raw:string|null):RosterState{
 if(!raw)return roster;
 let parsed:unknown;
 try{parsed=JSON.parse(raw);}catch{return roster;}
 if(!parsed||typeof parsed!=='object')return roster;
 const version=(parsed as {version?:unknown}).version;
 if(version!==1&&version!==2)return roster;
 const members=(parsed as {members?:unknown}).members;
 if(!Array.isArray(members)||members.length>16)return roster;
 return {...roster,members:roster.members.map(base=>{
  const input=members.find(x=>x&&typeof x==='object'&&x.id===base.id);
  if(!input)return base;
  const weapon=version===1?input.weapon:input.weaponConfiguration?.weapon;
  if(!validWeapon(weapon))return base;
  const decoded=readWeaponConfiguration(input.weaponConfiguration,weapon);
  if(version===2&&!decoded.build)return base;
  const config=resolveCatalogConfiguration(decoded,weapon,starterWeaponPreset(base.id));
  const loadout=readEquipmentLoadout(input.loadout,weapon,base.id);
  const issue=freshMagazineIssue(base.id,weapon,config);
  const placements=Array.isArray(input.magazineLocations)?
   input.magazineLocations.slice(0,32):[];
  const mags=issue.magazines.map((mag,i)=>({
   ...mag,location:validLocation(placements[i])?placements[i]:mag.location
  }));
  return {...base,weapon,weaponConfiguration:config,
   loadout,magazine:issue.magazine,reserve:issue.reserve,
   magazines:stageMagazines(mags,loadout),loadedMagazineId:issue.loadedMagazineId};
 })};
}
/** Prepare the next fresh round with the same authored kit but new ammo,
 * zero injuries and no campaign-style physical stock duplication.
 */
export function refreshQuickPlayPreparedRoster(roster:RosterState):RosterState{
 return applyQuickPlayKitPreferences(freshQuickPlayRoster(roster),
  serializeQuickPlayKitPreferences(roster));
}
