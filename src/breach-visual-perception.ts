/** Pure, simulation-timed visual acquisition. Geometry is checked separately. */
export function visualGain(distance:number,offAxis:number,
 moving:boolean,crouched:boolean):number{
 if(distance>240||Math.abs(offAxis)>.94)return 0;
 const range=Math.max(.30,1-distance/340);
 const facing=Math.max(.30,1-Math.abs(offAxis)/1.25);
 return range*facing*(moving?1.28:1)*(crouched?.82:1);
}
/** Losing literal line of sight immediately breaks confirmed sight.
 * Confidence can accumulate again when a target reappears. */
export function advanceSight(previous:number,dt:number,gain:number,
 geometricSight:boolean):number{
 if(!geometricSight||gain<=0)return 0;
 return Math.min(1,previous+dt*gain*5.8);
}
export const confirmedSight=(progress:number)=>progress>=.999;
