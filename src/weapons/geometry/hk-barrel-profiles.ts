/** Fieldwork HK/G3 game-art proportions; no internal weapon construction data.
 * All renderer, pose and muzzle locations are authored in the same local units.
 */
export type HKBarrelArt={
 id:string;lengthScale:number;handguardStartX:number;handguardEndX:number;
 barrelStartX:number;frontSightX:number;muzzleX:number;
};
export const HK_BARREL_ART:Readonly<Record<string,HKBarrelArt>>={
 'hk-g3-service':{
  id:'hk-g3-service',lengthScale:.95,handguardStartX:4.05,
  handguardEndX:14.05,barrelStartX:13.4,frontSightX:17.4,muzzleX:22.4
 },
 'hk33-service':{
  id:'hk33-service',lengthScale:.95,handguardStartX:4.05,
  handguardEndX:13.00,barrelStartX:12.60,frontSightX:16.25,muzzleX:20.00
 },
 'hk53-short':{
  id:'hk53-short',lengthScale:.95,handguardStartX:4.05,
  handguardEndX:9.25,barrelStartX:8.90,frontSightX:10.65,muzzleX:12.90
 },
 'hk-mp5-standard-barrel':{
  id:'hk-mp5-standard-barrel',lengthScale:.95,handguardStartX:3.12,
  handguardEndX:9.55,barrelStartX:8.90,frontSightX:10.65,muzzleX:12.65
 },
 'hk-mp5sd-integrated':{
  id:'hk-mp5sd-integrated',lengthScale:.95,handguardStartX:3.12,
  handguardEndX:9.85,barrelStartX:9.40,frontSightX:9.95,muzzleX:16.60
 },
 'hk-mp5k-short':{
  id:'hk-mp5k-short',lengthScale:.95,handguardStartX:3.12,
  handguardEndX:4.55,barrelStartX:4.20,frontSightX:5.25,muzzleX:6.05
 }
};
export const hkBarrelArt=(id:string)=>HK_BARREL_ART[id];
