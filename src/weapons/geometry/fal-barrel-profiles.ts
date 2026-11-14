/** FN FAL 50.00 exterior art datums; one shared authority for muzzle and holds.
 * Coordinates are Fieldwork game-art units, not scaled firearm measurements.
 */
export type FALBarrelArt={
 id:string;nominalInches:number;lengthScale:number;
 handguardStartX:number;handguardEndX:number;
 frontSightX:number;muzzleX:number;muzzleY:number;
};
export const FAL_BARREL_ART:Readonly<Record<string,FALBarrelArt>>={
 'fal-21-service':{
  id:'fal-21-service',nominalInches:21,lengthScale:.95,
  handguardStartX:3.80,handguardEndX:14.10,
  frontSightX:14.70,muzzleX:22.00,muzzleY:0
 }
};
export const falBarrelArt=(id:string):FALBarrelArt|undefined=>
 FAL_BARREL_ART[id];
