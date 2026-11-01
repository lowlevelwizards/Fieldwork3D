/** Building function and maintenance tone are separate from property condition.
 * All values remain visual-only; no occupancy or tactical side effects.
 */
export type SurfaceMood={
 maintenance:'clinical'|'commercial'|'domestic'|'industrial';
 wearFraction:number;
 acceptsOil:boolean;
};
const moods:Record<string,SurfaceMood>={
 clinic:{maintenance:'clinical',wearFraction:.30,acceptsOil:false},
 office:{maintenance:'commercial',wearFraction:.65,acceptsOil:false},
 restaurant:{maintenance:'commercial',wearFraction:.85,acceptsOil:false},
 retail:{maintenance:'commercial',wearFraction:.75,acceptsOil:false},
 apartment:{maintenance:'domestic',wearFraction:.75,acceptsOil:false},
 townhouse:{maintenance:'domestic',wearFraction:.75,acceptsOil:false},
 house:{maintenance:'domestic',wearFraction:.75,acceptsOil:false},
 motel:{maintenance:'commercial',wearFraction:.8,acceptsOil:false},
 warehouse:{maintenance:'industrial',wearFraction:1,acceptsOil:true},
 garage:{maintenance:'industrial',wearFraction:1,acceptsOil:true},
 utility:{maintenance:'industrial',wearFraction:1,acceptsOil:true},
};
export const surfaceMood=(archetype:string|undefined):SurfaceMood=>
 moods[archetype??'']??{maintenance:'commercial',wearFraction:.8,acceptsOil:false};
