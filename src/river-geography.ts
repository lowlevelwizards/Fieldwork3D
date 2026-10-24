/**
 * Build 025 — durable geographic river definition, independent of weather.
 *
 * Terrain carving, bank location, and continuous river surface share this
 * one description. This is the *main north/south channel*, not a smoothed
 * re-interpretation of the 32x32 runoff graph every simulation tick.
 *
 * Physical hydraulic volume remains owned exclusively by TerrainWater.
 */
export const MAIN_RIVER={
  bedIncisionM:.082,
  halfBankM:.46,
  corridorMinZ:-5,
  corridorMaxZ:5,
} as const;
export type RiverStation={x:number;z:number;bedY:number;bankLeftY:number;bankRightY:number};
export const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

/** Matches the original deterministic Verdigris valley axis identically. */
export function mainRiverCenterX(z:number):number{
  return .33*Math.sin(z*.48)+.16*Math.sin(z*.92+.6);
}
export function mainRiverIncisionAt(x:number,z:number):number{
  const offset=x-mainRiverCenterX(z);
  return MAIN_RIVER.bedIncisionM*Math.exp(-Math.pow(offset/MAIN_RIVER.halfBankM,2));
}
export function mainRiverTangent(z:number):{x:number;z:number}{
  const dx=.33*.48*Math.cos(z*.48)+.16*.92*Math.cos(z*.92+.6);
  const m=Math.hypot(dx,1);
  return {x:dx/m,z:1/m};
}
export function mainRiverNormal(z:number):{x:number;z:number}{
  const t=mainRiverTangent(z);
  return {x:t.z,z:-t.x};
}
/** Evaluate a cross-section in shared river coordinates, including its banks. */
export function mainRiverPosition(z:number,lateral:number):{x:number;z:number}{
  const n=mainRiverNormal(z);
  return {x:mainRiverCenterX(z)+n.x*lateral,z:z+n.z*lateral};
}
export function mainRiverStations(
  height:(x:number,z:number)=>number,segments=96,
):RiverStation[]{
  if(!Number.isInteger(segments)||segments<4||segments>512)
    throw new Error('Invalid river segments');
  return Array.from({length:segments+1},(_,i)=>{
    const z=MAIN_RIVER.corridorMinZ+
      (MAIN_RIVER.corridorMaxZ-MAIN_RIVER.corridorMinZ)*i/segments;
    const p=mainRiverPosition(z,0);
    const l=mainRiverPosition(z,-MAIN_RIVER.halfBankM);
    const r=mainRiverPosition(z,MAIN_RIVER.halfBankM);
    return {x:p.x,z,bedY:height(p.x,p.z),
      bankLeftY:height(l.x,l.z),bankRightY:height(r.x,r.z)};
  });
}
