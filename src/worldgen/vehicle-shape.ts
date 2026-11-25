/** Shared normalized vehicle silhouettes; model and coarse cover profile
 * consume identical body/cabin proportions. No renderer dependency. */
import type {VehicleFamily} from './vehicle-catalog.ts';
export type VehicleSideProfile=readonly (readonly [number,number])[];
export function vehicleShape(f:VehicleFamily){
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
