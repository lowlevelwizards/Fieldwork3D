/** R4.4 AK visual barrel architecture. Coordinates describe ONLY
 * stylized art + its already authoritative visual muzzle contact.
 * Model X increases rear -> muzzle, local Y is vertical, Z is side depth.
 */
export type AKBarrelArt={
 id:string; lengthScale:number; handguardFrontX:number;
 gasBlockX:number; frontSightX:number; muzzleX:number;
 gasTubeBeginX:number; muzzleStyle:'standard'|'carbine'|'booster'|'rpk';
};
export const AK_BARREL_ART:Readonly<Record<string,AKBarrelArt>>={
 'ak-long':{
  id:'ak-long',lengthScale:.94,handguardFrontX:12.10,
  gasTubeBeginX:11.35,gasBlockX:14.55,
  frontSightX:15.90,muzzleX:19.5,muzzleStyle:'standard'
 },
 'ak-mid':{
  id:'ak-mid',lengthScale:.90,handguardFrontX:11.55,
  gasTubeBeginX:10.75,gasBlockX:12.9,
  frontSightX:14.1,muzzleX:16.1,muzzleStyle:'carbine'
 },
 'ak-short':{
  id:'ak-short',lengthScale:.86,handguardFrontX:10.75,
  gasTubeBeginX:10.2,gasBlockX:11.35,
  frontSightX:11.45,muzzleX:13.0,muzzleStyle:'booster'
 },
 'ak-rpk-long':{
  id:'ak-rpk-long',lengthScale:.94,handguardFrontX:13.0,
  gasTubeBeginX:12.15,gasBlockX:15.7,
  frontSightX:22.98,muzzleX:24.7,muzzleStyle:'rpk'
 }
};
export function akBarrelArt(id:string):AKBarrelArt|undefined{
 return AK_BARREL_ART[id];
}
