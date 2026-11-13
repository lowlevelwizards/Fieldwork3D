/** A3.8-T: commit a clear side for nearly 180-degree physical pivots.
 * This is fixed-tick motor intent only. Actual actor, boot motion and
 * collision stay with their existing authorities.
 */
export type PivotSide=-1|1;
export type PivotEpisode={goal:number;side:PivotSide};
export type PivotAssessment={left:number;right:number};
export const PIVOT_TIE_BAND=.22;
export const PIVOT_RETARGET_BAND=.16;
const angle=(from:number,to:number)=>
 Math.atan2(Math.sin(to-from),Math.cos(to-from));
const sign=(n:number):PivotSide=>n<0?-1:1;
const magnitude=(delta:number,side:PivotSide)=>
 side*delta>=0?Math.abs(delta):Math.PI*2-Math.abs(delta);
/** Each assessment score is a count of real, unblocked trial footfalls.
 * Retain previous commitment through the half-turn even after the angular
 * shortest path becomes ambiguous at -PI/+PI. No history in rendering.
 */
export function selectPivotEpisode(
 heading:number,goal:number,
 assessment:PivotAssessment={left:0,right:0},
 previous:PivotEpisode|null=null
):PivotEpisode|null{
 if(!Number.isFinite(heading)||!Number.isFinite(goal))return null;
 const delta=angle(heading,goal),error=Math.abs(delta);
 if(error<.075)return null;
 if(previous&&Number.isFinite(previous.goal)&&
    Math.abs(angle(previous.goal,goal))<PIVOT_RETARGET_BAND&&
    previous.side*angle(heading,goal)>-.08)
  return {...previous,goal};
 let side=sign(delta);
 // Only override the shortest route when competing paths differ by no
 // more than 12.6°. A 90° turn cannot be sent around the other 270°.
 if(Math.PI-error<=PIVOT_TIE_BAND){
  const shortest=side,alternative=sign(-delta);
  const shortScore=shortest===1?assessment.left:assessment.right;
  const alternateScore=alternative===1?assessment.left:assessment.right;
  if(alternateScore>shortScore)side=alternative;
 }
 return {goal,side};
}
export function committedPivotDelta(
 heading:number,goal:number,episode:PivotEpisode|null
):number{
 const delta=angle(heading,goal);
 if(!episode||!Number.isFinite(delta))return delta;
 // For non-ambiguous retargets the shortest direction wins; a re-directed
 // command may not continue winding around an entire circle.
 if(Math.abs(angle(goal,episode.goal))>=PIVOT_RETARGET_BAND)
  return delta;
 return episode.side*magnitude(delta,episode.side);
}
/** The two possible rotational directions use identical actual boot width,
 * target arc and collision predicate. No point is an invented relocation.
 * +side is positive world-heading rotation. */
export function assessPivotFootClearance(
 position:{x:number;y:number},heading:number,
 canPlant:(point:{x:number;y:number})=>boolean
):PivotAssessment{
 const score=(side:PivotSide)=>{
  let good=0;
  // First one, then the other boot replants. Sample the first half-turn
  // when the turning direction matters most beside a wall or shelf.
  // The support (trailing) boot stays planted during the first half.
  // Favor a clear lead-foot swing before the later follow-foot replant.
  // Sampling both feet at every angle makes left/right appear equivalent
  // in symmetric stance even beside an asymmetric wall.
  for(const delta of [.24,.55,1.00]){
   const yaw=heading+side*delta;
   const lead={x:position.x-Math.sin(yaw)*5.6,
     y:position.y+Math.cos(yaw)*5.6};
   if(canPlant(lead))good+=2;
  }
  const followYaw=heading+side*1.00;
  if(canPlant({x:position.x+Math.sin(followYaw)*5.6,
    y:position.y-Math.cos(followYaw)*5.6}))good++;

  return good;
 };
 return {left:score(1),right:score(-1)};
}
