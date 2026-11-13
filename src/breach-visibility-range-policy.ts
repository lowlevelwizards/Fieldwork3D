/** V0: distance authority, independent of aim and tactical knowledge.
 * One Fieldwork meter = 20 world units. A clear view extends to the map
 * boundary, not an arbitrary CQB engagement cutoff.
 */
export const WORLD_UNITS_PER_METER=20;
export const NEAR_FINE_SIGHT_RANGE=240; // 12 m; detail sampling only.
export type SightBounds={minX:number;minY:number;maxX:number;maxY:number};
const FALLBACK_BOUNDS:SightBounds={minX:0,minY:0,maxX:640,maxY:740};
const bySite=new WeakMap<object,number>();

/** Worst-case map diagonal reaches every corner from any point in the lot.
 * +1 keeps strict-radius rejection numerically away from border corners.
 */
export function sightRangeForBounds(bounds:SightBounds):number{
 return Math.ceil(Math.hypot(bounds.maxX-bounds.minX,
   bounds.maxY-bounds.minY))+1;
}
/** Compute once per generated site; no hypot in high-frequency LOS queries. */
export function sightRangeForSite(site?:{bounds?:SightBounds}|null):number{
 if(!site)return sightRangeForBounds(FALLBACK_BOUNDS);
 const saved=bySite.get(site);
 if(saved!==undefined)return saved;
 const value=sightRangeForBounds(site.bounds??FALLBACK_BOUNDS);
 bySite.set(site,value);
 return value;
}
