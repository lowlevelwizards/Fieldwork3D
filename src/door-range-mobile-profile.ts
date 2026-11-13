/** D6: bounded, strictly opt-in 60-second Door Test Range frame history.
 * RAF gaps are browser scheduling intervals, not measured GPU time. CPU
 * simulation and 2D canvas costs are separate wall-clock slices.
 */
export const DOOR_RANGE_PROFILE_BUCKET_MS=250;
export const DOOR_RANGE_PROFILE_WINDOW_MS=60000;
export const DOOR_RANGE_PROFILE_BUCKET_COUNT=
 DOOR_RANGE_PROFILE_WINDOW_MS/DOOR_RANGE_PROFILE_BUCKET_MS;
export type DoorRangeFrame=Readonly<{
 at:number;raf:number;sim:number;paint:number;steps:number
}>;
export type DoorRangeProfileBucket={
 index:number;at:number;frames:number;steps:number;
 worstRaf:number;worstSim:number;worstPaint:number;
 simSum:number;paintSum:number;slow:number;severe:number;suspensions:number
};
export type DoorRangeProfileSnapshot=Readonly<{
 windowMs:number;bucketMs:number;frames:number;ticks:number;
 slow:number;severe:number;suspensions:number;worstRaf:number;
 worstSim:number;worstPaint:number;meanSim:number;meanPaint:number;
 buckets:DoorRangeProfileBucket[]
}>;
const sane=(n:number)=>Number.isFinite(n)?Math.max(0,n):0;
export class DoorRangeMobileProfile {
 private readonly buckets:(DoorRangeProfileBucket|undefined)[]=
  new Array(DOOR_RANGE_PROFILE_BUCKET_COUNT);
 reset():void{this.buckets.fill(undefined);}
 /** Returns true only when the 250-ms graph bucket changed. */
 add(frame:DoorRangeFrame):boolean{
  if(!Number.isFinite(frame.at)||frame.at<0)return false;
  const id=Math.floor(frame.at/DOOR_RANGE_PROFILE_BUCKET_MS);
  const slot=id%DOOR_RANGE_PROFILE_BUCKET_COUNT;
  let bucket=this.buckets[slot],changed=false;
  if(!bucket||bucket.index!==id){
   bucket={index:id,at:id*DOOR_RANGE_PROFILE_BUCKET_MS,
    frames:0,steps:0,worstRaf:0,worstSim:0,worstPaint:0,
    simSum:0,paintSum:0,slow:0,severe:0,suspensions:0};
   this.buckets[slot]=bucket;changed=true;
  }
  const raf=sane(frame.raf),sim=sane(frame.sim),paint=sane(frame.paint);
  bucket.frames++;
  bucket.steps+=Math.max(0,Math.floor(sane(frame.steps)));
  bucket.worstRaf=Math.max(bucket.worstRaf,raf);
  bucket.worstSim=Math.max(bucket.worstSim,sim);
  bucket.worstPaint=Math.max(bucket.worstPaint,paint);
  bucket.simSum+=sim;bucket.paintSum+=paint;
  if(raf>=33.3)bucket.slow++;
  if(raf>=67)bucket.severe++;
  if(raf>=1000)bucket.suspensions++;
  return changed;
 }
 snapshot(now:number):DoorRangeProfileSnapshot{
  const last=Math.floor(sane(now)/DOOR_RANGE_PROFILE_BUCKET_MS);
  const first=Math.floor((sane(now)-DOOR_RANGE_PROFILE_WINDOW_MS)/
   DOOR_RANGE_PROFILE_BUCKET_MS);
  const buckets=this.buckets.filter((b):b is DoorRangeProfileBucket=>
   b!==undefined&&b.index>=first&&b.index<=last)
   .sort((a,b)=>a.index-b.index)
   .map(b=>({...b}));
  let frames=0,ticks=0,slow=0,severe=0,suspensions=0;
  let worstRaf=0,worstSim=0,worstPaint=0,simSum=0,paintSum=0;
  for(const b of buckets){
   frames+=b.frames;ticks+=b.steps;slow+=b.slow;severe+=b.severe;
   suspensions+=b.suspensions;
   worstRaf=Math.max(worstRaf,b.worstRaf);
   worstSim=Math.max(worstSim,b.worstSim);
   worstPaint=Math.max(worstPaint,b.worstPaint);
   simSum+=b.simSum;paintSum+=b.paintSum;
  }
  return {windowMs:DOOR_RANGE_PROFILE_WINDOW_MS,
   bucketMs:DOOR_RANGE_PROFILE_BUCKET_MS,frames,ticks,slow,severe,
   suspensions,worstRaf,worstSim,worstPaint,
   meanSim:frames?simSum/frames:0,meanPaint:frames?paintSum/frames:0,
   buckets};
 }
}