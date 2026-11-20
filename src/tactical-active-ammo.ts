/** S9.2: one read-only tactical ammo selector for primary and issued Glock.
 * The physically selected hand owns the HUD, not the primary weapon class
 * still assigned to the actor. Waypoint authoring may supply a projected hand.
 * No inventory mutation, synthetic rounds, or DOM dependencies.
 */
import type {TeamActor} from './breach-game.ts';
import {WEAPONS} from './breach-combat.ts';
import {liveMagazineCapacity} from './arsenal/live-magazine-capacity.ts';
import {SECONDARY_CAPACITY} from './secondary-equipment.ts';
import type {WeaponHand} from './secondary-switching.ts';

export type ActiveAmmoReadout=Readonly<{
 hand:WeaponHand;label:string;loaded:number;capacity:number;reserve:number;
 spareMagazines:number;reloading:boolean;reloadProgress:number;
}>;
const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function tacticalActiveAmmo(a:TeamActor,
 projected?:WeaponHand):ActiveAmmoReadout{
 const selected=projected??((a.secondarySwitch?.fraction??0)>=.5?
   'secondary':'primary');
 const kit=selected==='secondary'&&a.equipment?.secondary?.weapon?
   a.equipment.secondary:null;
 if(kit){
  const progress=a.secondaryReload?
   clamp(a.secondaryReload.elapsed/Math.max(.001,a.secondaryReload.duration)):0;
  return {hand:'secondary',label:kit.weapon!.replace('glock-','GLOCK ').toUpperCase(),
   loaded:kit.loadedRounds,capacity:SECONDARY_CAPACITY[kit.weapon!],
   reserve:kit.spareMagazines.reduce((sum,m)=>sum+m.rounds,0),
   spareMagazines:kit.spareMagazines.length,
   reloading:!!a.secondaryReload,reloadProgress:progress};
 }
 return {hand:'primary',label:WEAPONS[a.weapon].label,
  loaded:a.magazine,capacity:liveMagazineCapacity(a.weapon,a.weaponConfiguration),
  reserve:a.reserve,spareMagazines:a.spareMagazines.length,
  reloading:a.reload>0,reloadProgress:a.reload>0?
   clamp(1-a.reload/Math.max(.001,a.reloadDuration)):0};
}
