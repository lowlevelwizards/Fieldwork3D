/** VEH 1: canonical static vehicle recipes. No random or runtime simulation. */
export const VEHICLE_FAMILIES=['sedan','hatchback','pickup','suv','van','light-truck'] as const;
export type VehicleFamily=typeof VEHICLE_FAMILIES[number];
export const VEHICLE_DIMENSIONS:Readonly<Record<VehicleFamily,readonly [number,number,number]>>={
 sedan:[96,39,33],hatchback:[77,36,33],pickup:[110,43,39],
 suv:[101,43,42],van:[109,44,47],'light-truck':[128,48,59],
};
export const VEHICLE_PAINTS=[0xc5c3b8,0xa1a5a4,0x43494b,0x282d30,0xa4977d,0x77634b,0x657a8b,0x44596e,0x758575,0x77764f,0x9c514b,0xb7a064] as const;
export const VEHICLE_CONFIGURATIONS={
 sedan:['civilian','taxi','police','unmarked','fleet'],
 hatchback:['civilian','economy','municipal'],
 pickup:['civilian','covered','cargo','contractor','military'],
 suv:['civilian','police','unmarked','military','aid'],
 van:['cargo','passenger','delivery','police','medical','contractor'],
 'light-truck':['box','flatbed','canvas','municipal','military'],
} as const satisfies Record<VehicleFamily,readonly string[]>;
export type VehicleCondition='clean'|'used'|'weathered';
export type VehicleRecipe=Readonly<{family:VehicleFamily;configuration:string;paint:number;condition:VehicleCondition}>;
export function vehicleFamily(id:string):VehicleFamily|undefined{
 return id==='vehicle'?'sedan':VEHICLE_FAMILIES.find(f=>f===id);
}
export function vehicleRecipe(family:VehicleFamily,variant=0):VehicleRecipe{
 const variants=VEHICLE_CONFIGURATIONS[family];
 const n=Number.isFinite(variant)?Math.abs(Math.trunc(variant)):0;
 return {family,configuration:variants[n%variants.length],paint:VEHICLE_PAINTS[Math.floor(n/variants.length)%VEHICLE_PAINTS.length],condition:'clean'};
}
export function vehicleRecipeKey(recipe:VehicleRecipe,width:number,depth:number,height:number):string{
 return ['vehicle:v3',recipe.family,recipe.configuration,recipe.paint,recipe.condition,width,depth,height].join(':');
}
