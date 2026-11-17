/** H2 controlled, deterministic gameplay audit. Values are sampled from the
 * actual combat and stock/shot-clearance functions, not UX-only ratings.
 * Movement/door checks use actual rigid muzzle safety in fixed scene inputs.
 */
import {WEAPONS} from '../src/breach-combat.ts';
import {BALLISTICS} from '../src/breach-ballistics.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,readWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponHandlingModifiers,sightAcquisitionScale,sightSpreadScale}
 from '../src/equipment-weapon-handling.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';

export const H2_AUDIT_MODELS=Object.freeze([
 ['M4A1','carbine','ar-m4a1'],
 ['M16A2','rifle','ar-m16a2'],
 ['AKM','rifle','ak-akm'],
 ['MP5A3','smg','hk-mp5a3'],
 ['MP5K','smg','hk-mp5k'],
 ['G3A3','rifle','hk-g3a3'],
 ['FAL 50.00','rifle','fal-5000'],
 ['FNC','rifle','fnc-service'],
 ['G36','rifle','g36-service']
]);
export const h2Preset=(weapon,id)=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(weapon),id);
const round=(n)=>Math.round(n*10000)/10000;
export function measureWeapon(config){
 const w=WEAPONS[config.weapon],b=BALLISTICS[config.weapon],
  h=weaponHandlingModifiers(config),a=resolveWeaponAssembly(config);
 const input={x:110,z:70,heading:0,weaponYaw:0,weapon:config.weapon,
  weaponConfiguration:config,aim:1,velocity:0,recoil:0,posture:'stand'};
 const tip=muzzleAtShot(input);
 // Place a vertical obstacle at a fixed distance ahead of the actor.
 // The shot-time muzzle solver remains the sole authority for a blocked lane.
 const wall={a:{x:128,y:0},b:{x:128,y:160}};
 const response=weaponClearance(input,[],[],[wall]);
 return Object.freeze({
  sight:h.sightSystem,
  nearAimSeconds:round(w.acquisition*sightAcquisitionScale(h,75)),
  farAimSeconds:round(w.acquisition*sightAcquisitionScale(h,220)),
  aimedSpreadRad:round(b.adsSpread*sightSpreadScale(h,'ads',220)),
  swingRadPerSecond:round(b.turnSpeed*h.turn),
  recoveryPerSecond:round(b.recover*h.recovery),
  recoilKickRad:round(b.recoilKick*h.recoilKick),
  reloadSeconds:round(w.reload*h.manipulation),
  overallLength:round((a.muzzleX-a.stockX)*a.lengthScale),
  muzzleX:round(a.muzzleX*a.lengthScale),
  stockX:round(a.stockX*a.lengthScale),
  wallBlocked:response.blocked,
  wallObstruction:response.obstruction,
  wallShoulderPullback:round(response.shoulderPullback??0),
  muzzleBeforeWall:response.muzzle.x<=wall.a.x+.0001,
  muzzleOriginalX:round(tip.x)
 });
}
export function measureH2Matrix(){
 return H2_AUDIT_MODELS.map(([name,weapon,id])=>({
  name,weapon,id,...measureWeapon(h2Preset(weapon,id))}));
}
export function measureAttachmentTradeoff(){
 const normal=h2Preset('carbine','ar-m4a1');
 const reflex=setWeaponAttachment(normal,'optic','optic-reflex');
 const suppressor=setWeaponAttachment(normal,'muzzle','muzzle-suppressor');
 const stock=readWeaponConfiguration({...normal,stockPosition:'collapsed'},
  'carbine');
 return {base:measureWeapon(normal),reflex:measureWeapon(reflex),
  suppressor:measureWeapon(suppressor),collapsed:measureWeapon(stock)};
}
if(process.argv[1]?.endsWith('audit-arsenal-h2-handling.mjs'))
 console.log(JSON.stringify({version:1,units:'game',models:measureH2Matrix(),
  attachments:measureAttachmentTradeoff()},null,2));
