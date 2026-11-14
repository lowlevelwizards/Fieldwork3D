/** Pure, simulation-timed visual acquisition. Geometry is checked separately. */
export function visualGain(distance:number,offAxis:number,
 moving:boolean,crouched:boolean):number{
 // A clear silhouette never disappears at a short arbitrary radius.
 // Recognition becomes progressively slower beyond close quarters.
 if(Math.abs(offAxis)>.94)return 0;
 const range=1/(1+Math.pow(Math.max(0,distance)/220,1.35));
 const facing=Math.max(.30,1-Math.abs(offAxis)/1.25);
 return range*facing*(moving?1.28:1)*(crouched?.82:1);
}
/** One fixed-step scalar still owns both silhouette and positive ID.
 * Beyond near CQB, detail recognition is slower than merely noticing a
 * person; this never changes LOS, the first detection threshold or RNG.
 */
export const SIGHT_DETECTION_THRESHOLD=.16;
export function identificationRate(distance:number):number{
 // Already-visible detail costs at most 42% more progress time. Near
 // 12-metre contacts retain the original positive-identification rate.
 return 1-Math.min(.42,Math.max(0,distance-240)*.42/1600);
}
/** Losing literal line of sight immediately breaks confirmed sight.
 * A distant silhouette is available on the original detection clock, then
 * remaining progress advances at its bounded recognition rate. No second
 * timer and no post-occlusion memory grants shooting permission.
 *
 * The optional recognition factor defaults to 1 for old/offline callers.
 */
export function advanceSight(previous:number,dt:number,gain:number,
 geometricSight:boolean,recognitionRate=1):number{
 if(!geometricSight||gain<=0)return 0;
 const step=dt*gain*5.8;
 if(recognitionRate>=1)return Math.min(1,previous+step);
 if(previous>=SIGHT_DETECTION_THRESHOLD)
  return Math.min(1,previous+step*recognitionRate);
 const next=previous+step;
 if(next<=SIGHT_DETECTION_THRESHOLD)return Math.min(1,next);
 // The fraction of the crossing tick before detection retains the old
 // speed; only the interval AFTER the silhouette gets the ID penalty.
 return Math.min(1,SIGHT_DETECTION_THRESHOLD+
  (next-SIGHT_DETECTION_THRESHOLD)*recognitionRate);
}
/** Unidentified presence (no allegiance, targeting or exact enemy intel). */
export const detectedSight=(progress:number)=>
 progress>=SIGHT_DETECTION_THRESHOLD;
/** Positive identification and engagement evidence. */
export const confirmedSight=(progress:number)=>progress>=.999;
