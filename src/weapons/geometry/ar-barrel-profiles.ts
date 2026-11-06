/** R4.2 game-art barrel library. Nominal lengths label real-world classes;
 * these exaggerated local X extents describe ICONIC game silhouettes.
 * The operator pose, workbench, accessories and shot-time geometry share
 * these landmarks. No new ammo/stats or physical assembly procedure.
 */
/** One shared elevated visual bore/fore-end line, relative to receiver side. */
export const AR_VISUAL_AXIS_Y=.52;
/** Art-only landmarks: actual sights sit BELOW the exaggerated A-frame roof. */
export const AR_SIGHT_POST_Y=3.35;
export const AR_FRONT_GUARD_ROOF_Y=4.10;
export type ARBarrelArt={
 nominalInches:number;
 profile:'pencil'|'service'|'government'|'spr'|'cqb';
 sight:'a1'|'a2'|'folding'|'compact';
 muzzleX:number;sightX:number|null;lengthScale:number;
 barrelHeight:number;barrelDepth:number;
};
export const AR_BARREL_ART:Readonly<Record<string,ARBarrelArt>>={
 'ar-20':{nominalInches:20,profile:'pencil',sight:'a1',
  muzzleX:22.2,sightX:15.08,lengthScale:.95,barrelHeight:1.0,barrelDepth:1.35},
 'ar-20-service':{nominalInches:20,profile:'service',sight:'a2',
  muzzleX:22.2,sightX:15.08,lengthScale:.95,barrelHeight:1.32,barrelDepth:1.5},
 'ar-spr18':{nominalInches:18,profile:'spr',sight:'folding',
  muzzleX:21.2,sightX:17.2,lengthScale:.96,barrelHeight:1.5,barrelDepth:1.65},
 'ar-145':{nominalInches:14.5,profile:'pencil',sight:'a1',
  muzzleX:18.4,sightX:12.90,lengthScale:.91,barrelHeight:1.02,barrelDepth:1.35},
 'ar-145-gov':{nominalInches:14.5,profile:'government',sight:'a2',
  muzzleX:18.4,sightX:13.17,lengthScale:.91,barrelHeight:1.38,barrelDepth:1.5},
 'ar-733-115':{nominalInches:11.5,profile:'service',sight:'a2',
  muzzleX:16.6,sightX:12.90,lengthScale:.88,barrelHeight:1.27,barrelDepth:1.5},
 'ar-103':{nominalInches:10.3,profile:'cqb',sight:'compact',
  muzzleX:15.8,sightX:null,lengthScale:.85,barrelHeight:1.45,barrelDepth:1.75}
};
export const arBarrelArt=(id:string):ARBarrelArt|undefined=>AR_BARREL_ART[id];
