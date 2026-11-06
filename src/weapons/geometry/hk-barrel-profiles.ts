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
 }
};
export const hkBarrelArt=(id:string)=>HK_BARREL_ART[id];
