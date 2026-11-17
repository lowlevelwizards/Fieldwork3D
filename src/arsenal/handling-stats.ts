/** Workbench-only projection of live game parameters into comparable bars.
 * These are relative, explicitly normalized UI scores, not new game balance
 * values. Never modify combat state, save data or authoritative weapon rules.
 */
import {WEAPONS} from '../breach-combat.ts';
import {BALLISTICS} from '../breach-ballistics.ts';
import {resolveWeaponAssembly} from '../equipment-weapon-assemblies.ts';
import {weaponHandlingModifiers,sightAcquisitionScale,sightSpreadScale}
 from '../equipment-weapon-handling.ts';
import {arsenalRecipeToLegacy,type ArsenalRecipeV2} from './recipes.ts';
import {liveMagazineCapacity} from './live-magazine-capacity.ts';

export type ArsenalStatId='near'|'precision'|'turn'|'control'|'reload'|'compact'|'noise'|'capacity';
export type ArsenalHandlingStat=Readonly<{
 id:ArsenalStatId;label:string;score:number;detail:string;explanation:string;
}>;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
/** Fixed shared axes; changing the selected weapon never rescales the chart. */
const higher=(v:number,low:number,high:number)=>Math.round(100*clamp((v-low)/(high-low)));
const lower=(v:number,low:number,high:number)=>100-higher(v,low,high);
const decimals=(v:number,n=2)=>v.toFixed(n);

export function arsenalHandlingStats(recipe:ArsenalRecipeV2):readonly ArsenalHandlingStat[]|null{
 const config=arsenalRecipeToLegacy(recipe);
 if(!config)return null;
 const weapon=WEAPONS[config.weapon],ballistics=BALLISTICS[config.weapon];
 const mods=weaponHandlingModifiers(config);
 const assembly=resolveWeaponAssembly(config);
 const nearTime=weapon.acquisition*sightAcquisitionScale(mods,75);
 const farSpread=ballistics.adsSpread*sightSpreadScale(mods,'ads',220);
 const turn=ballistics.turnSpeed*mods.turn;
 const recoil=ballistics.recoilKick*mods.recoilKick;
 const recovery=ballistics.recover*mods.recovery;
 const control=recovery/recoil;
 const reload=weapon.reload*mods.manipulation;
 const audibleRadius=weapon.noise*mods.noise;
 const capacity=liveMagazineCapacity(config.weapon,config);
 // Forward-facing physical muzzle, not a substitute for shot-time
 // clearance. Stock, armor, context and furniture remain live checks.
 const muzzleReach=assembly.muzzleX*assembly.lengthScale;
 return [
  {id:'near',label:'QUICK AIM',score:lower(nearTime,.18,.67),
   detail:decimals(nearTime)+' s · near',
   explanation:'Base acquisition time at 75 game units. Moving, injury, skill and contact urgency also affect live aiming.'},
  {id:'precision',label:'SIGHTED FIRE',score:lower(farSpread,.018,.095),
   detail:decimals(farSpread,3)+' rad · far',
   explanation:'Base aimed dispersion at 220 game units, including the installed sight. This is not hit chance or damage.'},
  {id:'turn',label:'SWING SPEED',score:higher(turn,4.2,9.6),
   detail:decimals(turn,2)+' rad/s',
   explanation:'Authoritative weapon-turn speed before suppression and contact-urgency effects.'},
  {id:'control',label:'SHOT CONTROL',score:higher(control,1.5,11.0),
   detail:decimals(recovery,2)+' recover / '+decimals(recoil,3)+' kick',
   explanation:'Ratio of real recoil recovery to recoil kick. Higher means quicker settling after firing.'},
  {id:'reload',label:'RELOAD',score:lower(reload,1.25,3.3),
   detail:decimals(reload)+' s · base',
   explanation:'Base simulation reload duration. Injury, magazine placement and retention or shells add separate timing.'},
  {id:'compact',label:'COMPACTNESS',score:lower(muzzleReach,10,26),
   detail:decimals(muzzleReach,1)+' u · muzzle reach',
   explanation:'Physical forward-muzzle projection from the installed geometry. Live door/wall clearance still uses full rigid poses.'},
  {id:'noise',label:'QUIETNESS',score:lower(audibleRadius,180,550),
   detail:Math.round(audibleRadius)+' u · audible',
   explanation:'Real gunshot noise radius seen by enemy hearing. Higher score means quieter; no stealth or discovery immunity.'},
  {id:'capacity',label:'CAPACITY',score:higher(capacity,5,46),
   detail:capacity+' rounds · magazine',
   explanation:'Actual magazine capacity used by the mission. This does not add rounds or change owned inventory.'}
 ];
}
export function arsenalStatDeltas(current:readonly ArsenalHandlingStat[],
 previous:readonly ArsenalHandlingStat[]|null):ReadonlyMap<ArsenalStatId,number>{
 const prior=new Map<ArsenalStatId,number>(previous?.map(stat=>
  [stat.id,stat.score] as const)??[]);
 return new Map<ArsenalStatId,number>(current.map(stat=>[stat.id,
  prior.has(stat.id)?stat.score-prior.get(stat.id)!:0] as const));
}
