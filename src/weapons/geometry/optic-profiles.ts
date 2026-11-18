/** M2.4A — optic identity, physical mounting variant and sight class.
 * One source of authored footprint + eye-box facts for the solver and renderer.
 * Distances are stylized Fieldwork weapon-local units, NOT manufacturer data.
 */
import type {PartMountStandard} from '../../equipment-weapon-families.ts';
export type OpticSightClass='reflex'|'holographic'|'prism'|'telescopic'|'integrated';
export type OpticMountStandard=PartMountStandard|'integrated';
export type OpticProfile=Readonly<{
 id:string;familyId:string;name:string;
 sightClass:OpticSightClass;magnification:number;
 mount:Readonly<{standard:OpticMountStandard;variantId:string;
  integrated:boolean;clampOffsetsX:readonly number[];
  clampHalfX:number;baseHalfX:number;}>;
 visual:Readonly<{bodyProfileId:string;bodyHalfX:number;
  eyepieceOffsetX:number;axisAboveBaseY:number;
  /** Direct side mount raises the optic above its receiver side contact. */
  supportRiseY:number;axisOffsetZ:number;}>;
 eyeRelief:Readonly<{mode:'unrestricted'|'bounded';
  minDistance:number|null;maxDistance:number|null;
  maxVerticalError:number;maxLateralError:number;}>;
 preferredX:Readonly<Partial<Record<'ar'|'ak'|'hk'|'fal'|'fnc'|'g36',
  number>>>;
}>;
const free={mode:'unrestricted',minDistance:null,maxDistance:null,
 maxVerticalError:1.6,maxLateralError:1.65} as const;
const bounded={mode:'bounded',minDistance:1.0,maxDistance:8.5,
 maxVerticalError:1.35,maxLateralError:1.5} as const;
export const OPTIC_PROFILES:Readonly<Record<string,OpticProfile>>={
 'optic-reflex':{
  id:'optic-reflex',familyId:'legacy-reflex',name:'Reflex Sight',
  sightClass:'reflex',magnification:1,
  mount:{standard:'picatinny',variantId:'rail',integrated:false,
   clampOffsetsX:[-1.5,1.5],clampHalfX:.30,baseHalfX:2},
  visual:{bodyProfileId:'reflex-hood',bodyHalfX:2,
   eyepieceOffsetX:-1.55,axisAboveBaseY:2.10,supportRiseY:0,axisOffsetZ:0},
  eyeRelief:free,preferredX:{ar:0,ak:-2.02,hk:-1.60}
 },
 'optic-magnified':{
  id:'optic-magnified',familyId:'legacy-scope',name:'Magnified Optic',
  sightClass:'telescopic',magnification:4,
  mount:{standard:'picatinny',variantId:'rail',integrated:false,
   clampOffsetsX:[-1.65,1.45],clampHalfX:.48,baseHalfX:3.65},
  visual:{bodyProfileId:'scope-tube',bodyHalfX:3.75,
   eyepieceOffsetX:-3.20,axisAboveBaseY:2.125,supportRiseY:0,axisOffsetZ:0},
  eyeRelief:bounded,preferredX:{ar:.15,ak:-3.02,hk:-2.60}
 },
 'optic-kashtan-ak':{
  id:'optic-kashtan-ak',familyId:'1p78-kashtan',
  name:'1P78 Kashtan · AK Side Mount',sightClass:'prism',magnification:2.8,
  mount:{standard:'ak-side-dovetail',variantId:'ak-integral-side',
   integrated:true,clampOffsetsX:[0],clampHalfX:1.10,baseHalfX:1.55},
  visual:{bodyProfileId:'kashtan-prism',bodyHalfX:2.55,
   eyepieceOffsetX:-2.18,axisAboveBaseY:1.55,
   supportRiseY:3.42,axisOffsetZ:-.48},
  eyeRelief:bounded,preferredX:{ak:-1.80}
 },
 'optic-kashtan-p':{
  id:'optic-kashtan-p',familyId:'1p78-kashtan',
  name:'1P78 Kashtan P · Picatinny',sightClass:'prism',magnification:2.8,
  mount:{standard:'picatinny',variantId:'rail-clamp',integrated:false,
   clampOffsetsX:[0],clampHalfX:.65,baseHalfX:1.40},
  visual:{bodyProfileId:'kashtan-prism',bodyHalfX:2.55,
   eyepieceOffsetX:-2.18,axisAboveBaseY:1.55,
   supportRiseY:0,axisOffsetZ:0},
  eyeRelief:bounded,preferredX:{ar:-1.5,ak:-2.02,hk:-1.52}
 },
 'optic-g36-single':{
  id:'optic-g36-single',familyId:'g36-factory-single',
  name:'G36 Original Single Carry-Handle Optic',
  sightClass:'integrated',magnification:3,
  mount:{standard:'integrated',variantId:'factory-single',
   integrated:true,clampOffsetsX:[],clampHalfX:0,baseHalfX:0},
  visual:{bodyProfileId:'g36-single-carry',bodyHalfX:0,
   eyepieceOffsetX:0,axisAboveBaseY:0,supportRiseY:0,axisOffsetZ:0},
  eyeRelief:free,preferredX:{g36:-1.30}
 },
 'optic-g36-integrated':{
  id:'optic-g36-integrated',familyId:'g36-factory',
  name:'Original G36 Integral Dual Optic',sightClass:'integrated',
  magnification:3,
  mount:{standard:'integrated',variantId:'factory',
   integrated:true,clampOffsetsX:[],clampHalfX:0,baseHalfX:0},
  visual:{bodyProfileId:'g36-factory',bodyHalfX:0,
   eyepieceOffsetX:0,axisAboveBaseY:0,supportRiseY:0,axisOffsetZ:0},
  eyeRelief:free,preferredX:{g36:-1.30}
 }
};
export const opticProfile=(id:string):OpticProfile|undefined=>
 OPTIC_PROFILES[id];
