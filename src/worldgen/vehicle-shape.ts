/** Shared normalized vehicle silhouettes; model and coarse cover profile
 * consume identical body/cabin proportions. No renderer dependency. */
import type {VehicleFamily} from './vehicle-catalog.ts';
export type VehicleSideProfile=readonly (readonly [number,number])[];
export function legacyVehicleShape(f:VehicleFamily){
 const truck=f==='light-truck',pickup=f==='pickup',van=f==='van',suv=f==='suv',compact=f==='hatchback';
 const belt=truck?.39:van?.47:suv?.52:pickup?.53:.54;
 const lower=truck?.15:.18;
 const body:VehicleSideProfile=[[-.49,lower],[.49,lower],[.49,belt-.09],[.37,belt],[-.39,belt],[-.49,belt-.06]];
 const cabin:VehicleSideProfile=truck?[[.10,belt],[.46,belt],[.39,.81],[.12,.81]]:
 pickup?[[-.10,belt],[.33,belt],[.17,.94],[-.10,.94]]:
 van?[[-.44,belt],[.39,belt],[.22,.96],[-.43,.96]]:
 suv?[[-.42,belt],[.29,belt],[.13,.96],[-.36,.96]]:
 compact?[[-.40,belt],[.28,belt],[.10,.96],[-.28,.96]]:
 [[-.29,belt],[.30,belt],[.10,.96],[-.16,.96]];
 return {belt,lower,body,cabin,cw:truck?.42:van?.43:.365};
}

/** Front +X. Distinct coachwork, axle positions, tire radius as fraction
 * of width, and roof taper. Side outlines remain convex for coarse cover;
 * visible wheel openings are cut only by the mesh builder. */
export function vehicleShape(f:VehicleFamily){
 const profiles={
  sedan:{belt:.57,lower:.23,body:[[-.49,.23],[.49,.23],[.49,.49],[.34,.57],[-.32,.57],[-.49,.53]],cabin:[[-.29,.57],[.27,.57],[.10,.96],[-.15,.96]],cw:.405,roofWidth:.345,wheels:[-.315,.315],tire:.19,glassBottom:.20,glassTop:.84},
  hatchback:{belt:.56,lower:.24,body:[[-.49,.24],[.49,.24],[.49,.49],[.30,.56],[-.45,.56],[-.49,.52]],cabin:[[-.46,.56],[.25,.56],[.075,.96],[-.39,.96]],cw:.405,roofWidth:.345,wheels:[-.335,.30],tire:.19,glassBottom:.18,glassTop:.84},
  pickup:{belt:.62,lower:.32,body:[[-.49,.32],[.49,.32],[.49,.57],[.33,.62],[-.49,.62]],cabin:[[-.09,.62],[.28,.62],[.13,.96],[-.09,.96]],cw:.405,roofWidth:.36,wheels:[-.31,.32],tire:.225,glassBottom:.23,glassTop:.82},
  suv:{belt:.60,lower:.31,body:[[-.49,.31],[.49,.31],[.49,.55],[.30,.60],[-.49,.60]],cabin:[[-.46,.60],[.25,.60],[.13,.96],[-.42,.96]],cw:.405,roofWidth:.365,wheels:[-.32,.32],tire:.235,glassBottom:.20,glassTop:.84},
  van:{belt:.49,lower:.23,body:[[-.49,.23],[.49,.23],[.49,.44],[.40,.49],[-.49,.49]],cabin:[[-.49,.49],[.40,.49],[.24,.96],[-.48,.96]],cw:.43,roofWidth:.395,wheels:[-.32,.325],tire:.205,glassBottom:.24,glassTop:.83},
  'light-truck':{belt:.45,lower:.24,body:[[-.49,.24],[.49,.24],[.49,.45],[-.49,.45]],cabin:[[.09,.45],[.49,.45],[.465,.83],[.095,.83]],cw:.43,roofWidth:.40,wheels:[-.30,.34],tire:.225,glassBottom:.28,glassTop:.83}
 } as const;
 return profiles[f];
}
